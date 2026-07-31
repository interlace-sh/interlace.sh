---
title: Strategies
---

# Strategies

Strategies determine how a table model's data is updated when it builds. Set with `strategy:` in a SQL header or `strategy=` on `@model`.

## full (default)

Rebuild the whole table from the query on every build:

```sql
/* interlace:
  strategy: full
*/
SELECT ...
```

The right default for most transformations — simple, deterministic, and cheap on a columnar warehouse.

## merge_by_key

Upsert by key: new rows are inserted, existing keys are updated. Requires `key`.

```sql
/* interlace:
  strategy: merge_by_key
  key: order_id
*/
SELECT order_id, status, amount FROM raw_orders
```

Use when the model's query yields new-and-changed rows (an incremental extract, an API pull) and the table should accumulate.

## full_merge

Like `merge_by_key`, but the query is expected to produce the **complete** current state — matched keys update, new keys insert. Requires `key`.

## scd_type_2

Slowly-changing dimensions, type 2: instead of overwriting a changed row, the current version is closed and a new version opened. Requires `key`. Accepts the alias `scd2`.

```sql
/* interlace:
  strategy: scd_type_2
  key: customer_id
*/
SELECT customer_id, name, tier FROM raw_customers
```

Interlace manages two extra columns on the table:

| Column        | Meaning                                  |
| ------------- | ---------------------------------------- |
| `_valid_from` | When this version became current         |
| `_valid_to`   | When it was superseded (`NULL` = current)|

## incremental_by_time

Process the data one time window at a time, tracked in a durable **interval ledger**. Requires `time_column` and an `interval` grain:

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

- `interlace apply` processes only the **latest** grain interval
- `interlace run --start ... --end ...` catches up a window, skipping intervals the ledger already covers
- `interlace restate --start ... --end ...` reprocesses a window, ignoring the ledger

See the [backfill guide](/docs/guides/backfill) for the full workflow. SQL only — for Python models, use the `cursor` parameter with `merge_by_key` instead:

```python
@model(strategy="merge_by_key", key="id", cursor="updated_at")
def events(cursor):
    return fetch_rows(since=cursor)
```

## Requirements at a Glance

| Strategy              | Requires                 | Keeps history |
| --------------------- | ------------------------ | ------------- |
| `full`                | —                        | no            |
| `merge_by_key`        | `key`                    | yes           |
| `full_merge`          | `key`                    | yes           |
| `scd_type_2` (`scd2`) | `key`                    | yes           |
| `incremental_by_time` | `time_column`, `interval`| yes           |

History-keeping strategies interact with schema changes: a modified model would normally rebuild from scratch, destroying accumulated state. `interlace apply --forward-only` copies the existing history into the new snapshot instead — see [schema evolution](/docs/guides/schema-evolution#forward-only-changes).
