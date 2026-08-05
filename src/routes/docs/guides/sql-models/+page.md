---
title: SQL Models
---

# SQL Models

Write models in pure SQL. Interlace parses each file into an AST, infers dependencies from table references, and rewrites those references to the right snapshot tables at build time.

A `.sql` file is one model, **named by its path** under the models root: `models/silver/orders.sql` is the model `silver.orders`. Dependencies are discovered from the table references in the query — a reference whose name (or its last dotted segment) matches another model becomes a DAG edge; references that match no model (attached databases, `streams.*`) are left untouched.

## The Header Block

Configuration lives in a block comment containing YAML under an `interlace:` key:

```sql
/* interlace:
  strategy: merge_by_key
  key: order_id
  checks:
    - not_null: order_id
*/
SELECT order_id, customer_id, amount
FROM raw_orders
```

Mechanics worth knowing:

- Only the **first** `/* ... */` comment in the file is considered — put the config block before any license or doc comment
- The header is optional; without one you get `materialise: virtual`, `strategy: full`
- After the header is stripped, the file must contain **exactly one** SQL statement
- Unknown keys are silently ignored — watch for typos (`materialise` is the only key validated at discovery)

The full key reference is on the [models page](/docs/core-concepts/models#header-options).

## Materialisations and Strategies

`materialise` decides **where the result lands and who owns it**; [`strategy`](/docs/core-concepts/strategies) decides **how** it is written. The two compose. There are two planes — **owned** (interlace builds a snapshot and serves it through an environment view) and **terminal** (a destination interlace does not own, delivered to but never owned — see [terminal outputs](#terminal-outputs-external-tables-and-files) below).

| `materialise`       | Plane    | Produces                                                        | Strategies                                                                              |
| ------------------- | -------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `virtual` (default) | owned    | an immutable snapshot table, served through an environment view | `full` (default) · `merge_by_key` · `full_merge` · `incremental_by_time` · `scd_type_2` |
| `view`              | owned    | a `CREATE OR REPLACE VIEW` — no data, re-evaluated on read      | —                                                                                       |
| `ephemeral`         | owned    | nothing — the query is inlined as a CTE into downstream models  | —                                                                                       |
| `table`             | terminal | rows delivered into an external `target` table (reverse ETL)    | `full` (replace in place) · `append` · `merge_by_key` · `full_merge` · `incremental_by_time` |
| `file`              | terminal | a file at `path` (parquet · csv · json)                         | overwrite                                                                                |

Strategies are **destination-agnostic**: `merge_by_key`, `full_merge`, `incremental_by_time` and `scd_type_2` run identically on a `virtual` or an external `table`. Keyed strategies (`merge_by_key`, `full_merge`, `scd_type_2`) require `key`; `incremental_by_time` requires `time_column` and an `interval`. `view` and `ephemeral` take no strategy. See [strategies](/docs/core-concepts/strategies) for each one.

## Dialects and Engine Pinning

Models are written in the project's `default_dialect` (`duckdb` unless configured). Override per model with `dialect:`, or pin the model to a named engine — its dialect follows the engine:

```sql
/* interlace:
  engine: pg
*/
SELECT ...   -- runs on (and is parsed as) Postgres
```

Cross-engine dependencies are handled automatically — see [multi-engine](/docs/guides/multi-backend).

## Scheduling

Give a model a schedule and the [daemon](/docs/guides/rest-api) runs it:

```sql
/* interlace:
  schedule: {cron: "0 6 * * *"}   # 5-field cron
*/
```

```sql
/* interlace:
  schedule: {every: 15m}          # grain: s, m, h, d, w
*/
```

Scheduled runs are enqueued with idempotent keys, so a restarted scheduler never double-fires a slot.

## Terminal Outputs: External Tables and Files

Two materialisations deliver a model's result **outside** the managed environment, into a destination interlace does not own. They produce no environment view and nothing downstream can read them (depend on the model they select from instead), and they are [environment-gated](#environment-gating). This is reverse ETL, expressed as a model.

### To an external table

Deliver into a database declared under [`attach:`](/docs/guides/connections#attached-databases) in `interlace.yaml`, named `<alias>.<schema>.<table>`:

```sql
/* interlace:
  materialise: table
  target: crm.main.customer_scores
  strategy: merge_by_key
  key: customer_id
*/
SELECT customer_id, name, score, NOW() AS ts FROM customer_value
```

The `strategy` picks the delivery — the **same strategies as a `virtual` model**, pointed at the external table: `full` (DELETE all + INSERT, replace in place), `append` (external-only, an append-only log), `merge_by_key`, `full_merge`, and `incremental_by_time` (windowed delete + insert, tracked in the same interval ledger). interlace only ever creates, appends to, or **additively evolves** the target (new columns, widened types, NULL-fill) — it **never drops it**, so grants, indexes, RLS and downstream readers survive.

### To a file

```sql
/* interlace:
  materialise: file
  format: parquet          # parquet | csv | json
  path: exports/daily_revenue.parquet
*/
SELECT ...
```

`format` is one of `parquet`, `csv` (with header), or `json`; `path` is required and resolves relative to the project root. The file is overwritten via a DuckDB `COPY` on each build.

### Fields

| Field          | Applies to         | Description                                                               |
| -------------- | ------------------ | ------------------------------------------------------------------------- |
| `target`       | `table`            | `alias.schema.table` (or `alias.table`, schema defaults to `main`)        |
| `strategy`     | `table`            | `full` · `append` · `merge_by_key` · `full_merge` · `incremental_by_time` |
| `key`          | keyed strategies   | Merge key column(s)                                                       |
| `path`         | `file`             | Output path (project-relative)                                            |
| `format`       | `file`             | `parquet`, `csv`, or `json`                                               |
| `environments` | `table` and `file` | Which environments actually deliver — default `[prod]`, see below         |

### Environment gating

`table` and `file` are side-effecting, so by default they only deliver when applying to `prod`. A `dev` apply still builds and fingerprints the model — it just skips delivery (reported as _gated_). Widen explicitly:

```sql
/* interlace:
  materialise: table
  target: crm.main.scores
  strategy: merge_by_key
  key: id
  environments: [dev, prod]
*/
```

## Ephemeral Building Blocks

Factor shared logic into [ephemeral models](/docs/core-concepts/materialization#ephemeral) — they cost nothing and keep queries readable:

```sql
-- models/orders_gross.sql
/* interlace:
  materialise: ephemeral
*/
SELECT order_id, amount * 1.2 AS amount_gross FROM orders
```

Any model that references `orders_gross` gets it inlined as a CTE.

## Notes

- `cursor` is a Python-model feature; it has no effect in a SQL header
- Reading tables that aren't models (attached databases, `streams.*`) just works — unmatched references are left untouched

## Next Steps

- [Quality checks](/docs/guides/quality-checks) — the `checks:` list in depth
- [Strategies](/docs/core-concepts/strategies) — choosing an update strategy
- [Dynamic models](/docs/guides/dynamic-models) — generating many models from a loop
- [Engines & connections](/docs/guides/connections) — declaring `attach:` targets
