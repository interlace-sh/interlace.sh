---
title: Multi-Engine
---

# Multi-Engine Pipelines

One graph can span several engines: keep heavy transformations on the DuckLake warehouse, land curated outputs in Postgres, read reference data from attached databases. Interlace moves data between engines automatically.

## Pinning a Model to an Engine

Declare engines in `interlace.yaml`, then pin models:

```yaml
engines:
  pg:
    type: postgres
    database: 'postgresql://etl@db.internal:5432/analytics'
```

```sql
-- models/serving_orders.sql
/* interlace:
  engine: pg
*/
SELECT order_id, customer_id, amount FROM order_summary
```

`serving_orders` builds **on Postgres** (and its SQL is parsed in the Postgres dialect), even though its upstream `order_summary` lives on the warehouse. Engine types: `duckdb`, `ducklake`, `quack` and `postgres` are the tested set (`postgres` needs the `adbc` extra). `spark` (beta) runs SQL inside a PySpark session — tested against a local Spark+Delta, but `scd`/`full_merge` don't work there (Delta rejects subqueries in `UPDATE`/`DELETE`). `motherduck`, `redshift`, `snowflake` and `bigquery` are **alpha** — wired and dialect-correct, but not yet run against a live account, so try them, don't lean on them in production yet. The ADBC engines share one transport base, so a new backend is just a dialect + capabilities + a `connect`.

## Cross-Engine Transfers

When a model reads an upstream that lives on a different engine, the upstream is staged onto the consumer's engine before the build, in the `interlace__xfer` schema. Two lanes:

- **attach** (`via: attach`) — when the consumer is a DuckDB engine and the source is attachable (a DuckDB/DuckLake file, a Postgres DSN), the source is `ATTACH`ed and copied with one federated `CREATE TABLE ... AS SELECT` — no Python hop
- **arrow** (`via: arrow`) — otherwise, batches stream through Arrow (`fetch → load`) from source to target. `:memory:` and `quack` engines aren't attachable, so a transfer from one of those always takes the Arrow lane

Transfers are always **explicit plan line-items**, never hidden. Each upstream transfers once per apply per target engine, no matter how many models consume it. `interlace plan` lists them alongside changes:

```
transfers:
  order_summary: default -> pg (attach -> interlace__xfer.order_summary)
```

## Engine Capabilities

Strategies adapt to capability flags per engine (DuckDB-family, Snowflake and BigQuery on the left; Postgres, Redshift and Spark on the right):

| Capability                   | DuckDB / Snowflake / BigQuery | Postgres / Redshift | Effect when absent                                                      |
| ---------------------------- | :---------------------------: | :-----------------: | ----------------------------------------------------------------------- |
| `supports_create_or_replace` |               ✓               |          ✗          | `replace` falls back to `DROP TABLE` + `CREATE TABLE AS`                |
| `supports_star_exclude`      |               ✓               |          ✗          | `scd` enumerates the model's columns instead of `SELECT * EXCLUDE(...)` |
| `supports_merge`             |               ✓               |          ✓          | `merge` uses a portable `DELETE`+`INSERT` instead of a native `MERGE`   |

**Every strategy runs on every engine.** `merge` upserts with a native `MERGE` wherever it exists (DuckDB, Postgres, Redshift, Snowflake, BigQuery), else `DELETE`+`INSERT`. `scd` no longer needs `SELECT * EXCLUDE`: on Postgres/Redshift it enumerates the model's own columns to compare open rows — so history tracking works there too, it just needs an explicit projection rather than `SELECT *`.

## Rules and Behaviour

- **Ephemeral models must share their consumers' engine** — they're inlined as CTEs, so there's nothing to transfer; a mismatch is a definition error
- **Streams always live on the default warehouse engine** — the micro-batch materializer runs there
- Snapshots record which engine they were built on; `interlace checks run` verifies tables on the engine they were actually promoted to
- Fingerprints include the engine, so re-pinning a model is a change like any other and shows up in the plan
- **Engine maturity** — DuckDB-family, `quack` and `postgres` are the tested engines. `spark` (beta) is tested against a local Spark+Delta but doesn't support `scd`/`full_merge` (Delta rejects subqueries in `UPDATE`/`DELETE`). `motherduck` / `redshift` / `snowflake` / `bigquery` are alpha — shipped and dialect-correct, not yet validated against a live account. Databricks is not built (its connector is Arrow-native but has no ADBC bulk-load path).

## Attached Databases vs Engines

Two different tools:

|                     | `engines:`                     | `attach:`                                                                                                                             |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| What it is          | A place models **build**       | A database mounted read/write onto an engine                                                                                          |
| Dependency tracking | Full (transfers, fingerprints) | None — plain table references                                                                                                         |
| Writing             | Owned materialisations         | [Terminal `table`](/docs/core-concepts/materialization#table-external-reverse-etl) (`materialise: table, target: alias.schema.table`) |

```yaml
attach:
  crm: 'postgres:host=db.internal dbname=crm'
```

```sql
SELECT * FROM crm.main.customers          -- read an attached database
```

## Sharing the Warehouse

The `quack` engine type lets multiple processes use one warehouse: `interlace serve --quack quack:localhost:4213` serves it, and clients set `database: quack:localhost:4213` with the printed token in `INTERLACE_QUACK_TOKEN`. See [Engines & Connections](/docs/guides/connections#sharing-a-warehouse-quack).

## Next Steps

- [Engines & connections](/docs/guides/connections) — engine configuration in full
- [Configuration reference](/docs/reference/configuration)
