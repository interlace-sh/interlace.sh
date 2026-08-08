---
title: Strategies
---

<script>
  import { StrategyDiagram, StrategyLegend } from '$lib/components/docs';
</script>

# Strategies

A model's `strategy` decides **how its query result becomes a table** — set with `strategy:` in a SQL header or `strategy=` on `@model`. Every strategy is an AST builder: given the model's query and its target table, it emits a short list of SQL statements that `apply` runs **atomically** (one transaction). Strategies are column-agnostic, so a model's schema can change without hand-written migrations — a definition change simply mints a new snapshot table. (The one exception is `merge`'s native `MERGE`, which uses the target's already-known column list to build its `SET` clause and falls back to a column-agnostic path without it.)

Row movement is reported per model as `+inserted ~updated -deleted`.

**Strategies are destination-agnostic.** `merge`, `full_merge`, `hash_merge`, `incremental` and `scd` run identically whether the target is an interlace-owned [`virtual`](/docs/core-concepts/materialization) table or an external [`table`](/docs/core-concepts/materialization#table-external-reverse-etl) (reverse ETL). Only `replace` differs by ownership — see below — and `append` is external-only. `view` and `ephemeral` don't use strategies.

<StrategyLegend />

## replace (default)

<StrategyDiagram
name="replace"
qualifier="owned table · the default"
blurb="Rewrite the whole table from the query. The target ends up an exact copy of the source."
source={[{id:'1',val:"A′"},{id:'2',val:'B'},{id:'4',val:'D'}]}
before={[{id:'1',val:'A'},{id:'2',val:'B'},{id:'3',val:'C'}]}
after={[{id:'1',val:"A′",tag:'ins'},{id:'2',val:'B',tag:'ins'},{id:'4',val:'D',tag:'ins'},
{id:'1',val:'A',tag:'del'},{id:'2',val:'B',tag:'del'},{id:'3',val:'C',tag:'del'}]}
sql="CREATE OR REPLACE TABLE target AS <query>"
note="Every existing row goes, including row 2, which did not change. Row 3 has no source row, so it does not come back — target-only rows are lost."
caution
/>

Rebuild the whole table from the query on every build:

```sql
/* interlace:
  strategy: replace
*/
SELECT ...
```

```
CREATE OR REPLACE TABLE target AS <query>
```

On Postgres, which has no `CREATE OR REPLACE TABLE`, it falls back to `DROP TABLE IF EXISTS target` + `CREATE TABLE target AS <query>`.

The right default for most transformations — simple and deterministic. It rewrites every row every run; on DuckLake that writes new files even when nothing changed, so prefer `full_merge` when the source is a full snapshot and you want change-only writes.

On an external `table` (`materialise: table`), `replace` means **replace in place** — `DELETE FROM target` + `INSERT`, never a drop — so grants, indexes and readers on the live table survive:

```
CREATE TABLE IF NOT EXISTS target AS (SELECT * FROM (<query>) LIMIT 0)
DELETE FROM target                        -- empty in place
INSERT INTO target SELECT * FROM (<query>)
```

## append

<StrategyDiagram
name="append"
qualifier="external table only"
blurb="Add the query's rows. Nothing is deleted and nothing is matched, so the target only grows."
source={[{id:'1',val:"A′"},{id:'2',val:'B'},{id:'4',val:'D'}]}
before={[{id:'1',val:'A'},{id:'2',val:'B'},{id:'3',val:'C'}]}
after={[{id:'1',val:'A',tag:'kept'},{id:'2',val:'B',tag:'kept'},{id:'3',val:'C',tag:'kept'},
{id:'1',val:"A′",tag:'ins'},{id:'2',val:'B',tag:'ins'},{id:'4',val:'D',tag:'ins'}]}
sql="INSERT INTO target SELECT * FROM (<query>)"
note="There is no key, so ids 1 and 2 now appear twice. That is the point for a log or event table, and wrong for anything you expect to be unique."
/>

Add the query's rows to a table, deleting nothing. **External `table` only** (`materialise: table`) — a growing log or event table:

```sql
/* interlace:
  materialise: table
  target: analytics.main.event_log
  strategy: append
*/
SELECT event_id, kind, ts FROM events
```

```
CREATE TABLE IF NOT EXISTS target AS (SELECT * FROM (<query>) LIMIT 0)
INSERT INTO target SELECT * FROM (<query>)
```

## merge

<StrategyDiagram
name="merge"
qualifier="keyed upsert · partial"
blurb="Upsert the query's rows by key. Keys already in the target but absent from this run are left alone."
source={[{id:'1',val:"A′"},{id:'2',val:'B'},{id:'4',val:'D'}]}
before={[{id:'1',val:'A'},{id:'2',val:'B'},{id:'3',val:'C'}]}
after={[{id:'1',val:"A′",tag:'upd'},{id:'2',val:'B',tag:'upd'},{id:'3',val:'C',tag:'kept'},{id:'4',val:'D',tag:'ins'}]}
sql="MERGE INTO target USING (<query>) ON _t.id = _s.id"
note="Row 3 survives because merge never deletes. Row 2 is rewritten even though nothing changed — native MERGE touches every matched row; hash_merge is the version that does not."
/>

Keyed upsert. Requires `key`. Upserts the query's rows by key **without deleting** untouched rows:

```sql
/* interlace:
  strategy: merge
  key: order_id
*/
SELECT order_id, status, amount FROM raw_orders
```

Keys already in the target but **absent** from this run are **left untouched**. This is a _partial_ upsert, not a full sync — use it when each run supplies a slice of new-and-changed rows (a `cursor`-filtered extract, an API pull that only returns what changed). Multi-column keys are supported.

**Native `MERGE`** — on DuckDB (≥ 1.3) and Postgres (≥ 15), and when interlace knows the target's column list (the delivery paths already read it to align the source), the upsert is a single statement:

```
MERGE INTO target AS _t USING (<query>) AS _s
  ON _t.<key> = _s.<key>
  WHEN MATCHED THEN UPDATE SET <non-key col> = _s.<non-key col>, ...
  WHEN NOT MATCHED THEN INSERT (<cols>) VALUES (_s.<cols>)
```

Matched rows are **updated in place**, so surrogate ids, columns outside the query, and row identity survive, and the engine fires `UPDATE` (not `DELETE`+`INSERT`) triggers. The source is **not** deduplicated — two rows matching one target row is a genuine "your key isn't unique" bug, so the engine surfaces it as a cardinality error rather than interlace paying for a `DISTINCT` every run. `MERGE` reports one combined written count (no insert/update split).

**Fallback** — with no column list (a first delivery into a fresh table) or an engine without `MERGE`, a portable, column-agnostic path runs and keeps the exact `+new` / `~re-supplied` split:

```
CREATE TABLE IF NOT EXISTS target AS (SELECT * FROM (<query>) LIMIT 0)   -- ensure shape
DELETE FROM target WHERE <key> IN (SELECT <key> FROM (<query>))          -- clear re-supplied keys
INSERT INTO target SELECT * FROM (<query>)                               -- re-insert current rows
```

## full_merge

<StrategyDiagram
name="full_merge"
qualifier="full-state sync"
blurb="Treat the query as the complete desired state, and apply only the difference."
source={[{id:'1',val:"A′"},{id:'2',val:'B'},{id:'4',val:'D'}]}
before={[{id:'1',val:'A'},{id:'2',val:'B'},{id:'3',val:'C'}]}
after={[{id:'1',val:"A′",tag:'upd'},{id:'2',val:'B',tag:'skip'},{id:'4',val:'D',tag:'ins'},{id:'3',val:'C',tag:'del'}]}
sql="DELETE fresh keys; DELETE keys not in source; INSERT (source EXCEPT current)"
note="Same end state as replace, reached incrementally: row 2 is in no difference so it is never rewritten, and row 3 — absent from a full-state source — is a delete."
/>

For sources that can only hand you the **complete current state** — an API list endpoint with no updated-since filter, a snapshot export. Requires `key`. Treats the query as the desired state and applies only the difference, so an identical run writes nothing:

```
CREATE TABLE IF NOT EXISTS target AS (SELECT * FROM (<query>) LIMIT 0)
DELETE FROM target WHERE <key> IN (fresh keys)        -- old versions of changed rows
DELETE FROM target WHERE <key> NOT IN (source keys)   -- keys that vanished upstream
INSERT INTO target SELECT * FROM (fresh rows)          -- new keys + new versions
```

where `fresh = source EXCEPT current` (set difference — `EXCEPT` _is_ the row hash, no column list needed). The distinguishing behaviour: because the source is the full state, **a key that has vanished from it is a delete**. Unchanged rows appear in no difference, so they aren't rewritten (no new DuckLake files). Keys must be non-NULL (a NULL key never compares equal and would churn every run).

**`full_merge` vs `merge`** — both are keyed, but `merge` only touches the keys this run re-supplies and never deletes, while `full_merge` treats the query as the whole world and deletes anything missing from it. Reach for `full_merge` when absence upstream means "deleted"; reach for `merge` when you're feeding it incremental slices.

## hash_merge

<StrategyDiagram
name="hash_merge"
qualifier="change-detected upsert"
blurb="A keyed upsert that stores an _hash of the non-key columns and writes only what actually changed."
sourceLabel="source · _hash"
source={[{id:'1',val:"A′",meta:'#f31c'},{id:'2',val:'B',meta:'#9b2e'},{id:'4',val:'D',meta:'#0d7a'}]}
before={[{id:'1',val:'A',meta:'#a04e'},{id:'2',val:'B',meta:'#9b2e'},{id:'3',val:'C',meta:'#5cc1'}]}
after={[{id:'1',val:"A′",tag:'upd'},{id:'2',val:'B',tag:'skip'},{id:'3',val:'C',tag:'kept'},{id:'4',val:'D',tag:'ins'}]}
sql="UPDATE WHERE _hash <> _hash; INSERT WHERE key NOT IN target"
note="Row 2's hash matches, so nothing is written for it. Row 3 is kept — unlike full_merge, a vanished key is not a delete, because this is an upsert."
/>

A keyed upsert like `merge` (it keeps keys absent from the source — an upsert, not a full-state sync), but it stores an `_hash` column — an `md5` of the non-key columns — and writes **only what changed**. Requires `key`.

```
CREATE TABLE IF NOT EXISTS target AS (SELECT *, md5(<non-key cols>) AS _hash FROM (<query>) LIMIT 0)
UPDATE target SET <cols>, _hash = source._hash FROM (source+_hash)
   WHERE target.<key> = source.<key> AND target._hash <> source._hash   -- changed keys only
INSERT INTO target SELECT * FROM (source+_hash)
   WHERE <key> NOT IN (SELECT <key> FROM target)                        -- new keys only
```

A new key inserts, an existing key whose hash differs updates, an unchanged row is skipped — so a run over identical data writes nothing (no new DuckLake files), and the reported counts split cleanly into `+inserted` / `~updated`. The `_hash` is an ordinary stored column, visible to consumers. Keys must be non-NULL. Because the hash is built from the column list, a **SQL** `hash_merge` model needs an explicit projection (not `SELECT *`); a **Python** source model is fine — its columns come from the staged Arrow output.

**`hash_merge` vs `merge`** — `merge`'s native `MERGE` rewrites every matched row each run and reports one lumped count; `hash_merge` touches only the rows that actually changed and reports the insert/update split. **`hash_merge` vs `full_merge`** — both write change-only, but `full_merge` diffs the whole row with `EXCEPT` and deletes vanished keys (a full-state sync), while `hash_merge` compares a single `_hash` column (an O(key) join, cheaper on wide tables) and keeps vanished keys (an upsert).

## scd

<StrategyDiagram
name="scd"
qualifier="type 2 · processing time"
blurb="Never overwrite. A changed row has its open version closed and a new one inserted, so the old value stays queryable."
source={[{id:'1',val:"A′"},{id:'2',val:'B'},{id:'4',val:'D'}]}
before={[{id:'1',val:'A',meta:'open'},{id:'2',val:'B',meta:'open'},{id:'3',val:'C',meta:'open'}]}
after={[{id:'1',val:'A',meta:'→ now()',tag:'closed'},{id:'1',val:"A′",meta:'now() →',tag:'ins'},
{id:'2',val:'B',meta:'08:00 →',tag:'kept'},{id:'3',val:'C',meta:'→ now()',tag:'closed'},
{id:'4',val:'D',meta:'now() →',tag:'ins'}]}
sql="UPDATE open SET _valid_to = now() WHERE key IN (open EXCEPT source); INSERT (source EXCEPT open)"
note="Row 2 is in neither difference, so re-running is a no-op. Row 3 vanished upstream, which counts as a change: its version is closed rather than deleted. Query the present with _valid_to IS NULL."
/>

Slowly-changing dimension, type 2 — keeps **versioned history**. Requires `key`, and runs on **every engine**: engines with `SELECT * EXCLUDE` (DuckDB family, Snowflake, BigQuery) use it to project open rows; engines without it (Postgres, Redshift) enumerate the model's own columns instead — so an `scd` model there needs an explicit projection, not `SELECT *`.

```sql
/* interlace:
  strategy: scd
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

A changed key gets its old version **closed** (`_valid_to` stamped) and its new version **inserted** as current — full history is preserved. An unchanged row is in neither difference, so re-running is a no-op. The key may be composite. (The comparison uses `SELECT * EXCLUDE(_valid_from, _valid_to)` where the engine has it, and an explicit column list where it doesn't.)

**Event-time windows** — by default the windows are stamped with processing time (`now()`). Pass a `time_column` (an event timestamp carried in the source) and the windows follow the data instead: a new version's `_valid_from` is its own event time, and the version it supersedes is closed at _that same_ event time, so the windows **abut on when the change actually happened** rather than when interlace saw it. A key that vanishes upstream has no succeeding event, so it is still closed at processing time.

```sql
/* interlace:
  strategy: scd
  key: customer_id
  time_column: updated_at
*/
SELECT customer_id, name, tier, updated_at FROM raw_customers
```

<StrategyDiagram
name="scd + time_column"
qualifier="type 2 · event time"
blurb="The same shape, but the validity windows follow the data: they abut on when the change happened, not on when interlace saw it."
sourceLabel="source · updated_at"
source={[{id:'1',val:"A′",meta:'09:15'},{id:'2',val:'B',meta:'08:00'},{id:'4',val:'D',meta:'09:40'}]}
before={[{id:'1',val:'A',meta:'08:00 →'},{id:'2',val:'B',meta:'08:00 →'},{id:'3',val:'C',meta:'08:00 →'}]}
after={[{id:'1',val:'A',meta:'→ 09:15',tag:'closed'},{id:'1',val:"A′",meta:'09:15 →',tag:'ins'},
{id:'2',val:'B',meta:'08:00 →',tag:'kept'},{id:'3',val:'C',meta:'→ now()',tag:'closed'},
{id:'4',val:'D',meta:'09:40 →',tag:'ins'}]}
sql="_valid_from / _valid_to taken from updated_at instead of now()"
note="Row 1's old version closes at 09:15 and its new one opens at 09:15 — no gap, no overlap. Row 3 has no succeeding event, so it is still closed at processing time."
/>

## incremental

<StrategyDiagram
name="incremental"
qualifier="no key · the window is authoritative"
blurb="Read only the rows inside the window, then rewrite that window: delete everything already in it, insert what the source now says."
sourceLabel="source · event_at"
source={[{id:'9',val:'Z',meta:'05-30',tag:'unread'},{id:'1',val:"A′",meta:'06-01'},{id:'4',val:'D',meta:'06-01'}]}
sourceDivider={{after:1,label:'window → [06-01, 06-02)'}}
before={[{id:'1',val:'A',meta:'06-01'},{id:'3',val:'C',meta:'06-01'},{id:'9',val:'Z',meta:'05-30'}]}
after={[{id:'1',val:"A′",meta:'06-01',tag:'ins'},{id:'4',val:'D',meta:'06-01',tag:'ins'},
{id:'3',val:'C',meta:'06-01',tag:'del'},{id:'9',val:'Z',meta:'05-30',tag:'kept'}]}
sql="DELETE WHERE event_at >= start AND < end; INSERT the window's rows"
note="Row 3 was inside the window and is no longer in the source, so it goes: the period is rewritten from scratch. Row 9 sits outside the window and is never touched. Delete-then-reinsert is what makes reprocessing a window idempotent, and backfill and restate safe."
/>

Process the data one time window at a time, tracked in a durable **interval ledger** (in the state store, keyed by model and fingerprint). Requires `time_column` and an `interval` grain:

```sql
/* interlace:
  strategy: incremental
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

### With a `key`, the window stops being authoritative

Add `key:` and the window changes meaning: it still decides _what is read_, but the rows are **upserted by key** instead of the period being rewritten. A target row inside the window that the source no longer produces is then left alone.

```sql
/* interlace:
  strategy: incremental
  time_column: updated_at
  interval: 1d
  key: order_id
*/
SELECT order_id, status, amount, updated_at FROM raw_orders
```

```
MERGE INTO target USING (<query> filtered to the window) ON key    -- where supported
-- or, portably: DELETE WHERE key IN (windowed source); INSERT the window's rows
```

<StrategyDiagram
name="incremental + key"
qualifier="keyed · the window only bounds what is read"
blurb="Same window, same rows read — but the rows are upserted by key instead of the period being rewritten."
sourceLabel="source · event_at"
source={[{id:'9',val:'Z',meta:'05-30',tag:'unread'},{id:'1',val:"A′",meta:'06-01'},{id:'4',val:'D',meta:'06-01'}]}
sourceDivider={{after:1,label:'window → [06-01, 06-02)'}}
before={[{id:'1',val:'A',meta:'06-01'},{id:'3',val:'C',meta:'06-01'},{id:'9',val:'Z',meta:'05-30'}]}
after={[{id:'1',val:"A′",meta:'06-01',tag:'upd'},{id:'3',val:'C',meta:'06-01',tag:'kept'},
{id:'4',val:'D',meta:'06-01',tag:'ins'},{id:'9',val:'Z',meta:'05-30',tag:'kept'}]}
sql="MERGE INTO target USING (<query> filtered to the window) ON key"
note="Identical inputs to the panel above, opposite outcome for row 3: only keys the window's source supplies are touched, so a row that stopped being produced survives. Use this for late corrections to already-published rows; use the unkeyed form when the source is the whole truth for a period."
/>

Pick the unkeyed form when the source is the whole truth for a period, and the keyed form when it is a feed of changes — late-arriving corrections to rows you have already published, where the window is a cheap way to avoid rescanning history rather than a claim about what the period contains.

`incremental` also works with `materialise: table` — the same windowed delete+insert, run straight against the external table and tracked in the same interval ledger, which a plain reverse-ETL sink could never express.

The window is driven explicitly:

- `interlace apply` (and `interlace run` with no range) defaults to the **most recent** grain window
- `interlace run --start ... --end ...` fills the windows the ledger doesn't yet cover (catch-up), then records them; a second run over the same window is skipped
- `interlace restate --start ... --end ...` reprocesses a window even if the ledger already covers it

The `backfill` config controls the first build: `auto` (default) derives `[min, max]` of the time column from the source and fills it as one interval, `none` keeps only the latest grain, an ISO date pins the start. See the [backfill guide](/docs/guides/backfill) for the full workflow.

Python models may use `incremental` **with a `key`**: the function's Arrow output is staged and the window's rows are upserted into the target. Without a key it is refused — a SQL model has the window predicate pushed into its query so the engine computes only that window, but a Python function has already produced everything before the window could be applied, so the unkeyed form would do the full work every run while looking incremental. To bound what the function fetches, use `cursor`:

```python
@model(strategy="merge", key="id", cursor="updated_at")
def events(cursor):
    return fetch_rows(since=cursor)   # cursor is None on the first run
```

## At a Glance

| Strategy      | Planes             | Requires                                         | State across runs                                                                                              |
| ------------- | ------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `replace`     | `virtual`, `table` | —                                                | none — rebuilt (owned) / replaced in place (external)                                                          |
| `append`      | `table`            | —                                                | accumulates — inserts only, never deletes                                                                      |
| `merge`       | `virtual`, `table` | `key`                                            | accumulates — upserts re-supplied keys, never deletes                                                          |
| `full_merge`  | `virtual`, `table` | `key`                                            | accumulates — syncs to the source, deletes vanished keys                                                       |
| `hash_merge`  | `virtual`, `table` | `key` (SQL models need an explicit projection)   | accumulates — upserts changed keys via `_hash`, never deletes                                                  |
| `scd`         | `virtual`, `table` | `key` (explicit projection without star-EXCLUDE) | versioned history via `_valid_from` / `_valid_to`                                                              |
| `incremental` | `virtual`, `table` | `time_column`, `interval` (`key` optional)       | accumulates — one time window per run; without `key` the window is rewritten, with `key` its rows are upserted |

## History and Schema Changes

The state-carrying strategies — `merge`, `full_merge`, `hash_merge`, `scd`, `incremental` — accumulate data across runs only _under a stable definition_. A definition change mints a new fingerprint and therefore a fresh, empty snapshot table; the old accumulated state stays on the old table (snapshot semantics). To carry that state onto the new version, apply with **`--forward-only`**: it copies the existing table into the new fingerprint's table (copy-on-write) before the strategy runs, so the new logic applies going forward while history survives. Checks still gate before the view moves, and the old table remains the rollback target until `interlace gc`. See [schema evolution](/docs/guides/schema-evolution#forward-only-changes).
