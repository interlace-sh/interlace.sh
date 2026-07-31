---
title: SQL Models
---

# SQL Models

Write models in pure SQL. Interlace parses each file into an AST, infers dependencies from table references, and rewrites those references to the right snapshot tables at build time.

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
- The header is optional; without one you get `materialise: table`, `strategy: full`
- After the header is stripped, the file must contain **exactly one** SQL statement
- Unknown keys are silently ignored — watch for typos (`materialise` is the only key validated at discovery)

The full key reference is on the [models page](/docs/core-concepts/models#header-options).

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

## Sinks (export)

An `export` block turns a model into a **sink**: after building, its output is delivered outside the managed environment. Sinks get no environment view.

### To files

```sql
/* interlace:
  export: {to: parquet, path: exports/daily_revenue.parquet}
*/
SELECT ...
```

`to` accepts `parquet`, `csv` (with header), or `json`; `path` is required and resolves relative to the project root.

### To external tables

Deliver into a database declared under `attach:` in `interlace.yaml`:

```sql
/* interlace:
  export: {to: table, target: crm.main.customer_scores, mode: merge_by_key, key: customer_id}
*/
SELECT customer_id, name, score, NOW() AS ts FROM customer_value
```

| Field          | Required          | Description                                                     |
| -------------- | ----------------- | ---------------------------------------------------------------- |
| `to`           | yes               | `parquet`, `csv`, `json`, or `table`                              |
| `path`         | for file formats  | Output path                                                       |
| `target`       | for `to: table`   | `alias.schema.table` (or `alias.table`, schema defaults to `main`)|
| `mode`         | no (`replace`)    | `replace`, `append`, `merge_by_key`, `full_merge`                 |
| `key`          | for keyed modes   | Merge key column(s)                                               |
| `environments` | no (`[prod]`)     | Which environments actually deliver — see below                   |

The external table is never dropped: `replace` empties and refills it, keyed modes stage the output and merge, and schema differences are reconciled additively (new columns added, types widened) so downstream consumers of the target keep working.

### Environment gating

By default a sink only delivers when applying to `prod`. A `dev` apply still builds and fingerprints the model — it just skips delivery (reported as *gated*). Opt a sink into other environments explicitly:

```sql
/* interlace:
  export: {to: table, target: crm.main.scores, mode: merge_by_key, key: id,
           environments: [dev, prod]}
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
- [Engines & connections](/docs/guides/connections) — declaring `attach:` targets
