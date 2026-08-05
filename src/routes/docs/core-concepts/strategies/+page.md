---
title: Strategies
---

# Strategies

A model's `strategy` decides **how its query result becomes a table** — set with `strategy:` in a SQL header or `strategy=` on `@model`. Every strategy is an AST builder: given the model's query and its target table, it emits a short list of SQL statements that `apply` runs **atomically** (one transaction). None of them needs the model's column list, so a model's schema can change without hand-written migrations — a definition change simply mints a new snapshot table.

Row movement is reported per model as `+inserted ~updated -deleted`.

## full (default)

Rebuild the whole table from the query on every build:

```sql
/* interlace:
  strategy: full
*/
SELECT ...
```

```
CREATE OR REPLACE TABLE target AS <query>
```

On Postgres, which has no `CREATE OR REPLACE TABLE`, it falls back to `DROP TABLE IF EXISTS target` + `CREATE TABLE target AS <query>`.

The right default for most transformations — simple and deterministic. It rewrites every row every run; on DuckLake that writes new files even when nothing changed, so prefer `full_merge` when the source is a full snapshot and you want change-only writes.

## merge_by_key

Keyed upsert. Requires `key`. Upserts the query's rows by key **without deleting** untouched rows:

```sql
/* interlace:
  strategy: merge_by_key
  key: order_id
*/
SELECT order_id, status, amount FROM raw_orders
```

```
CREATE TABLE IF NOT EXISTS target AS (SELECT * FROM (<query>) LIMIT 0)   -- ensure shape
DELETE FROM target WHERE <key> IN (SELECT <key> FROM (<query>))          -- clear re-supplied keys
INSERT INTO target SELECT * FROM (<query>)                               -- re-insert current rows
```

A re-supplied key's old row is deleted then re-inserted, so it reads as an **update**; keys already in the target but **absent** from this run are **left untouched**. This is a _partial_ upsert, not a full sync — use it when each run supplies a slice of new-and-changed rows (a `cursor`-filtered extract, an API pull that only returns what changed). Multi-column keys use a tuple `IN` predicate.

## full_merge

For sources that can only hand you the **complete current state** — an API list endpoint with no updated-since filter, a snapshot export. Requires `key`. Treats the query as the desired state and applies only the difference, so an identical run writes nothing:

```
CREATE TABLE IF NOT EXISTS target AS (SELECT * FROM (<query>) LIMIT 0)
DELETE FROM target WHERE <key> IN (fresh keys)        -- old versions of changed rows
DELETE FROM target WHERE <key> NOT IN (source keys)   -- keys that vanished upstream
INSERT INTO target SELECT * FROM (fresh rows)          -- new keys + new versions
```

where `fresh = source EXCEPT current` (set difference — `EXCEPT` _is_ the row hash, no column list needed). The distinguishing behaviour: because the source is the full state, **a key that has vanished from it is a delete**. Unchanged rows appear in no difference, so they aren't rewritten (no new DuckLake files). Keys must be non-NULL (a NULL key never compares equal and would churn every run).

**`full_merge` vs `merge_by_key`** — both are keyed, but `merge_by_key` only touches the keys this run re-supplies and never deletes, while `full_merge` treats the query as the whole world and deletes anything missing from it. Reach for `full_merge` when absence upstream means "deleted"; reach for `merge_by_key` when you're feeding it incremental slices.

## scd_type_2

Slowly-changing dimension, type 2 — keeps **versioned history**. Requires `key` and an engine with star-EXCLUDE projections (the DuckDB family, Snowflake, BigQuery — **not** Postgres, where it raises a clear error).

```sql
/* interlace:
  strategy: scd_type_2
  key: customer_id
*/
SELECT customer_id, name, tier FROM raw_customers
```

The target carries the query's columns plus two managed columns:

| Column        | Meaning                                   |
| ------------- | ----------------------------------------- |
| `_valid_from` | when this version became current          |
| `_valid_to`   | when it was superseded (`NULL` = current) |

Each run compares the source against the currently-open rows using set difference:

```
-- close open rows whose content no longer matches any source row (changed or key deleted):
UPDATE target SET _valid_to = now() WHERE _valid_to IS NULL AND <key> IN (open rows EXCEPT source)
-- insert source rows with no exact open match (new keys and new versions):
INSERT INTO target SELECT *, now(), NULL FROM (source EXCEPT open rows)
```

A changed key gets its old version **closed** (`_valid_to` stamped) and its new version **inserted** as current — full history is preserved. An unchanged row is in neither difference, so re-running is a no-op. (The `EXCLUDE(_valid_from, _valid_to)` projection used to compare content against the source is why the engine must support star-EXCLUDE.)

## incremental_by_time

Process the data one time window at a time, tracked in a durable **interval ledger** (in the state store, keyed by model and fingerprint). Requires `time_column` and an `interval` grain:

```sql
/* interlace:
  strategy: incremental_by_time
  time_column: day
  interval: 1d
*/
SELECT CAST(ts AS DATE) AS day, count(*) AS events, sum(amount) AS revenue
FROM events
GROUP BY day
```

Per window `[start, end)` it deletes then re-inserts — which is what makes reprocessing idempotent, and backfill/restatement safe:

```
DELETE FROM target WHERE day >= start AND day < end
INSERT INTO target SELECT * FROM (<query>) WHERE day >= start AND day < end
```

The window is driven explicitly:

- `interlace apply` (and `interlace run` with no range) defaults to the **most recent** grain window
- `interlace run --start ... --end ...` fills the windows the ledger doesn't yet cover (catch-up), then records them; a second run over the same window is skipped
- `interlace restate --start ... --end ...` reprocesses a window even if the ledger already covers it

The `backfill` config controls the first build: `auto` (default) derives `[min, max]` of the time column from the source and fills it as one interval, `none` keeps only the latest grain, an ISO date pins the start. See the [backfill guide](/docs/guides/backfill) for the full workflow.

This strategy is SQL-only. For Python models, use the `cursor` parameter with a keyed strategy instead:

```python
@model(strategy="merge_by_key", key="id", cursor="updated_at")
def events(cursor):
    return fetch_rows(since=cursor)   # cursor is None on the first run
```

## At a Glance

| Strategy              | Requires                   | State across runs                                        |
| --------------------- | -------------------------- | -------------------------------------------------------- |
| `full`                | —                          | none — the table is rebuilt each run                     |
| `merge_by_key`        | `key`                      | accumulates — upserts re-supplied keys, never deletes    |
| `full_merge`          | `key`                      | accumulates — syncs to the source, deletes vanished keys |
| `scd_type_2`          | `key`, star-EXCLUDE engine | versioned history via `_valid_from` / `_valid_to`        |
| `incremental_by_time` | `time_column`, `interval`  | accumulates — one time window per run                    |

## History and Schema Changes

The four state-carrying strategies — `merge_by_key`, `full_merge`, `scd_type_2`, `incremental_by_time` — accumulate data across runs only _under a stable definition_. A definition change mints a new fingerprint and therefore a fresh, empty snapshot table; the old accumulated state stays on the old table (snapshot semantics). To carry that state onto the new version, apply with **`--forward-only`**: it copies the existing table into the new fingerprint's table (copy-on-write) before the strategy runs, so the new logic applies going forward while history survives. Checks still gate before the view moves, and the old table remains the rollback target until `interlace gc`. See [schema evolution](/docs/guides/schema-evolution#forward-only-changes).
