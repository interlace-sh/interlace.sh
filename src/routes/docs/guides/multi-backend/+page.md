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
    database: "postgresql://etl@db.internal:5432/analytics"
```

```sql
-- models/serving_orders.sql
/* interlace:
  engine: pg
*/
SELECT order_id, customer_id, amount FROM order_summary
```

`serving_orders` builds **on Postgres** (and its SQL is parsed in the Postgres dialect), even though its upstream `order_summary` lives on the warehouse. Engine types: `duckdb`, `ducklake`, `quack`, `postgres` (the latter needs the `adbc` extra).

## Cross-Engine Transfers

When a model reads an upstream that lives on a different engine, the upstream is staged onto the consumer's engine before the build, in the `interlace__xfer` schema. Two lanes:

- **attach** — when the consumer is DuckDB-family and the source is attachable (a DuckDB/DuckLake file, a Postgres DSN), the source is `ATTACH`ed and copied with one federated `CREATE TABLE ... AS SELECT`
- **arrow** — otherwise, batches stream through Arrow from source to target

Each upstream transfers once per apply per target engine, no matter how many models consume it. `interlace plan` lists pending transfers alongside changes:

```
transfers:
  order_summary: default -> pg (attach)
```

## Rules and Behaviour

- **Ephemeral models must share their consumers' engine** — they're inlined as CTEs, so there's nothing to transfer; a mismatch is a definition error
- Snapshots record which engine they were built on; `interlace checks run` verifies tables on the engine they were actually promoted to
- Fingerprints include the engine, so re-pinning a model is a change like any other and shows up in the plan

## Attached Databases vs Engines

Two different tools:

| | `engines:` | `attach:` |
| --- | --- | --- |
| What it is | A place models **build** | A database mounted read/write onto an engine |
| Dependency tracking | Full (transfers, fingerprints) | None — plain table references |
| Writing | Model materialisation | [Table sinks](/docs/guides/sql-models#sinks-export) (`export: {to: table, target: alias.schema.table}`) |

```yaml
attach:
  crm: "postgres:host=db.internal dbname=crm"
```

```sql
SELECT * FROM crm.main.customers          -- read an attached database
```

## Sharing the Warehouse

The `quack` engine type lets multiple processes use one warehouse: `interlace serve --quack quack:localhost:4213` serves it, and clients set `database: quack:localhost:4213` with the printed token in `INTERLACE_QUACK_TOKEN`. See [Engines & Connections](/docs/guides/connections#sharing-a-warehouse-quack).

## Next Steps

- [Engines & connections](/docs/guides/connections) — engine configuration in full
- [Configuration reference](/docs/reference/configuration)
