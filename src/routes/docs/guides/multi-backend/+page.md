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

`serving_orders` builds **on Postgres** (and its SQL is parsed in the Postgres dialect), even though its upstream `order_summary` lives on the warehouse. Engine types: `duckdb`, `ducklake`, `quack`, `postgres` (the latter needs the `adbc` extra).

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

Strategies adapt to two capability flags per engine — everything else is portable by construction, because keyed strategies use `DELETE`+`INSERT` rather than a native `MERGE`:

| Capability                   | DuckDB family | Postgres | Effect when absent                                         |
| ---------------------------- | :-----------: | :------: | ---------------------------------------------------------- |
| `supports_create_or_replace` |       ✓       |    ✗     | `full` falls back to `DROP TABLE` + `CREATE TABLE AS`      |
| `supports_star_exclude`      |       ✓       |    ✗     | `scd_type_2` is refused — it needs `SELECT * EXCLUDE(...)` |

So `full`, `view`, `merge_by_key`, `full_merge`, and `incremental_by_time` all run on Postgres. **`scd_type_2` is DuckDB-family only** — pinning an SCD-2 model to a Postgres engine raises a clear plan error.

## Rules and Behaviour

- **Ephemeral models must share their consumers' engine** — they're inlined as CTEs, so there's nothing to transfer; a mismatch is a definition error
- **Streams always live on the default warehouse engine** — the micro-batch materializer runs there
- Snapshots record which engine they were built on; `interlace checks run` verifies tables on the engine they were actually promoted to
- Fingerprints include the engine, so re-pinning a model is a change like any other and shows up in the plan
- **Snowflake and BigQuery are on the roadmap, not shipped** — the four engine types above are what 1.0.2 ships

## Attached Databases vs Engines

Two different tools:

|                     | `engines:`                     | `attach:`                                                                                               |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| What it is          | A place models **build**       | A database mounted read/write onto an engine                                                            |
| Dependency tracking | Full (transfers, fingerprints) | None — plain table references                                                                           |
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
