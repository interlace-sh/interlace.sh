---
title: Engines & Connections
description: 'Declare engines in interlace.yaml. Every project has a default warehouse — a local DuckDB file with no configuration at all — plus named engines and attached databases.'
---

# Engines & Connections

Interlace executes models on **engines** declared in `interlace.yaml`. Every project has a default engine — the warehouse — and can add named engines and attached databases.

## The Warehouse

With no configuration at all, the warehouse is a local DuckDB file — one file, single-process, no catalog. Switch to [DuckLake](https://ducklake.select) (`database: ducklake:…`) when `interlace serve` and a separate CLI must write the same warehouse concurrently.

```yaml
name: my-project
database: .interlace/warehouse.duckdb
```

The `database` value determines the engine type:

| Value                                            | Engine                                          |
| ------------------------------------------------ | ----------------------------------------------- |
| `.interlace/warehouse.duckdb`                    | Plain DuckDB file (the default)                 |
| `ducklake:.interlace/warehouse.ducklake`         | DuckLake with a local catalog                   |
| `ducklake:postgres:dbname=lake host=db.internal` | DuckLake with a Postgres-hosted catalog         |
| `warehouse.duckdb`                               | Plain DuckDB file (another path)                |
| `:memory:`                                       | In-memory DuckDB                                |
| `quack:localhost:4213`                           | A warehouse served by `interlace serve --quack` |
| `postgresql://user@host:5432/db`                 | Postgres over ADBC (needs the `adbc` extra)     |

### DuckLake on object storage

Point `data_path` at a bucket and declare a secret for it:

```yaml
database: 'ducklake:postgres:${WAREHOUSE_DSN}'
data_path: s3://my-bucket/warehouse/
secrets:
  lake:
    type: s3
    key_id: ${AWS_ACCESS_KEY_ID}
    secret: ${AWS_SECRET_ACCESS_KEY}
    region: eu-west-2
```

Secret fields: `type` (currently `s3`), `key_id`, `secret`, and optional `endpoint` (host, no scheme), `region`, `url_style` (`path` for MinIO-style endpoints), `use_ssl`, `scope` (pin to a prefix like `s3://my-bucket`). Multiple warehouses can share one catalog database — give each its own `metadata_schema`.

## Named Engines

Models run on the default engine unless pinned. Declare additional engines under `engines:`:

```yaml
engines:
  pg:
    type: postgres
    database: 'postgresql://etl@db.internal:5432/analytics'
default_engine: default # which engine unpinned models use
```

Engine types: `duckdb`, `ducklake`, `quack`, and `postgres` (requires the `adbc` extra). Each engine accepts the same fields as the top level: `database`, `alias`, `data_path`, `metadata_schema`, `secrets`, `attach`, `dialect` (defaults from the type).

Pin a model with `engine:` in its header or `engine=` on `@model`; Interlace [moves data between engines automatically](/docs/guides/multi-backend).

> Postgres DSNs must name a host explicitly (`host=`, a URI host, `service=`, or `PGHOST`/`PGSERVICE` in the environment) — a DSN without one is rejected at startup rather than silently hitting a default socket.

## Attached Databases

`attach:` mounts external databases onto the warehouse engine — readable in any SQL model, and writable via a terminal [`table`](/docs/core-concepts/materialization#table-external-reverse-etl) materialisation (reverse ETL):

```yaml
attach:
  crm: crm.duckdb # local DuckDB file
  erp: 'postgres:host=db.internal dbname=erp' # Postgres
```

```sql
SELECT c.name, o.total
FROM crm.main.customers c
JOIN orders o ON o.customer_id = c.id
```

Attached tables are plain references, not modelled dependencies — Interlace doesn't rebuild anything when they change.

## Environment Variables and .env

`${VAR}` anywhere in `interlace.yaml` is interpolated before parsing — from the process environment first, then from a `.env` file next to `interlace.yaml`:

```yaml
database: 'ducklake:postgres:${WAREHOUSE_DSN}'
```

Unset variables are left as literal `${VAR}` so they surface loudly; if one survives into the warehouse config, Interlace refuses to start rather than treating it as a path. The `.env` parser supports comments, `export` prefixes, and quoted values — and never mutates your process environment.

## Sharing a Warehouse: quack

A local DuckDB file or DuckLake catalog serves one process at a time. To let teammates or other processes query the same warehouse, have the daemon serve it:

```bash
interlace serve --quack quack:localhost:4213
# prints a token; or pass --quack-token
```

Clients point their config at it:

```yaml
database: quack:localhost:4213
```

with the token in `quack_token:` or the `INTERLACE_QUACK_TOKEN` environment variable.

## Named connections

`connections:` names sources that are not warehouse engines. A Python model resolves one with `connection()` from `interlace.connections` while it is building. An `http` connection is also how a DuckDB [input](/docs/reference/configuration) authenticates, and a `postgres` connection is what a [`cdc:`](/docs/guides/streaming#postgres-cdc) block reads.

```yaml
connections:
  billing:
    type: http
    base_url: https://api.example.com
    headers: { Authorization: 'Bearer ${BILLING_TOKEN}' }
  source:
    type: postgres
    dsn: 'postgresql://etl:${SRC_PASSWORD}@db.internal:5432/app'
```

A `${VAR}` that is unset is a config error. `interlace connections` and `GET /connections` list names and types with those secret values redacted.

## Inspecting Engines

```bash
interlace engines          # name, default, type, dialect, database (credentials redacted)
interlace connections      # name, type, target (secrets redacted)
```

or `GET /engines` and `GET /connections` on the [HTTP API](/docs/guides/rest-api).

## Next Steps

- [Configuration reference](/docs/reference/configuration) — every field
- [Multi-engine](/docs/guides/multi-backend) — pinning and cross-engine transfers
