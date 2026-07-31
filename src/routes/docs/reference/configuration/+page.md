---
title: Configuration Reference
---

# Configuration Reference

Complete reference for `interlace.yaml`, located at the project root. Every field has a default — a project works with no config file at all. All paths resolve relative to the project root.

## Full Example

```yaml
name: my-project
default_dialect: duckdb
default_engine: default

# The warehouse (the synthesised "default" engine)
database: 'ducklake:postgres:${WAREHOUSE_DSN}'
data_path: s3://my-bucket/warehouse/
metadata_schema: my_project_meta

secrets:
  lake:
    type: s3
    key_id: ${AWS_ACCESS_KEY_ID}
    secret: ${AWS_SECRET_ACCESS_KEY}
    region: eu-west-2

engines:
  pg:
    type: postgres
    database: 'postgresql://etl@db.internal:5432/analytics'

attach:
  crm: crm.duckdb
  erp: 'postgres:host=db.internal dbname=erp'

model_paths: [models]
parallelism: 4
state_path: .interlace/state.db
stream_path: .interlace/streams.db
```

## Top-Level Fields

| Field             | Type          | Default                                    | Description                                                           |
| ----------------- | ------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `name`            | `str`         | `"interlace"`                              | Project name (also the default warehouse catalog alias)               |
| `database`        | `str`         | `"ducklake:.interlace/warehouse.ducklake"` | Warehouse URI — see [engine URIs](#engine-uris)                       |
| `default_dialect` | `str`         | `"duckdb"`                                 | SQL dialect models are written in                                     |
| `engines`         | `mapping`     | `{}`                                       | Named engines — see [engine fields](#engine-fields)                   |
| `default_engine`  | `str`         | `"default"`                                | Engine unpinned models run on                                         |
| `alias`           | `str`         | project name                               | Warehouse catalog's ATTACH alias                                      |
| `data_path`       | `str`         | —                                          | DuckLake data location (local dir or `s3://...`)                      |
| `metadata_schema` | `str`         | —                                          | Catalog schema holding this warehouse's DuckLake metadata             |
| `secrets`         | `mapping`     | `{}`                                       | Secrets created on the engine at open — see [secrets](#secret-fields) |
| `attach`          | `mapping`     | `{}`                                       | Databases to ATTACH: `alias: uri`                                     |
| `quack_token`     | `str`         | —                                          | Token for `quack:` databases (or `INTERLACE_QUACK_TOKEN`)             |
| `model_paths`     | `list[str]`   | `["models"]`                               | Where models are discovered                                           |
| `parallelism`     | `int` (min 1) | `4`                                        | Models building concurrently (`--parallelism` overrides)              |
| `state_path`      | `str`         | `".interlace/state.db"`                    | Control-plane SQLite database                                         |
| `stream_path`     | `str`         | `".interlace/streams.db"`                  | Durable stream log (SQLite WAL)                                       |

## Engine URIs

The `database` string determines the engine type:

| Form                                             | Meaning                                       |
| ------------------------------------------------ | --------------------------------------------- |
| `ducklake:.interlace/warehouse.ducklake`         | DuckLake, local catalog file (the default)    |
| `ducklake:postgres:dbname=lake host=db.internal` | DuckLake, catalog hosted in Postgres          |
| `warehouse.duckdb`                               | Plain DuckDB file                             |
| `:memory:`                                       | In-memory DuckDB                              |
| `quack:localhost:4213`                           | Warehouse served by `interlace serve --quack` |

Postgres as an **execution engine** is declared under `engines:` with `type: postgres` (never via the top-level `database`), and requires the `adbc` extra:

```yaml
engines:
  pg:
    type: postgres
    database: 'postgresql://user@host:5432/dbname'
```

Every Postgres DSN — engine, DuckLake catalog, or `attach:` — must name a host explicitly (`host=`, a URI host, `service=`, or `PGHOST`/`PGSERVICE`).

## Engine Fields

Each entry under `engines:` accepts:

| Field             | Type      | Default      | Description                                                   |
| ----------------- | --------- | ------------ | ------------------------------------------------------------- |
| `type`            | `str`     | `"ducklake"` | `duckdb`, `ducklake`, `quack`, or `postgres`                  |
| `database`        | `str`     | —            | Path/URI (falls back to the DuckLake default)                 |
| `dialect`         | `str`     | from `type`  | SQL dialect (duckdb-family → `duckdb`, postgres → `postgres`) |
| `alias`           | `str`     | engine name  | Catalog ATTACH alias                                          |
| `data_path`       | `str`     | —            | DuckLake data location                                        |
| `metadata_schema` | `str`     | —            | DuckLake metadata schema                                      |
| `secrets`         | `mapping` | `{}`         | Per-engine secrets                                            |
| `attach`          | `mapping` | `{}`         | Per-engine ATTACHes                                           |
| `quack_token`     | `str`     | —            | Token when `database` is `quack:`                             |

An engine named `default` overrides the synthesised warehouse engine entirely.

## Secret Fields

Each entry under `secrets:` becomes a `CREATE SECRET` on the engine at open — how a DuckLake warehouse on object storage authenticates:

| Field       | Default | Description                                    |
| ----------- | ------- | ---------------------------------------------- |
| `type`      | `"s3"`  | Secret type                                    |
| `key_id`    | —       | Access key ID                                  |
| `secret`    | —       | Secret access key                              |
| `endpoint`  | AWS     | `host[:port]`, no scheme (MinIO, R2, ...)      |
| `region`    | —       | Region                                         |
| `url_style` | —       | `path` for MinIO-style endpoints               |
| `use_ssl`   | —       | `true`/`false`                                 |
| `scope`     | —       | Pin the secret to a prefix, e.g. `s3://bucket` |

## Environment Variable Interpolation

`${VAR}` anywhere in the file is substituted **before** YAML parsing — from the process environment first, then from a `.env` file next to `interlace.yaml`:

```yaml
database: 'ducklake:postgres:${WAREHOUSE_DSN}'
```

- Only the braced `${VAR}` form is recognised (no `$VAR`, no `${VAR:-default}`)
- Unset variables stay as literal `${VAR}`; if one survives into the warehouse config, startup fails with the variable named — never a silent empty string
- The `.env` parser accepts comments, blank lines, an optional `export ` prefix, and quoted values; it never modifies your process environment

## Environment Variables Read by Interlace

| Variable                | Effect                                |
| ----------------------- | ------------------------------------- |
| `INTERLACE_ENV`         | Default for `--env`                   |
| `INTERLACE_QUACK_TOKEN` | Token for `quack:` databases          |
| `PGHOST` / `PGSERVICE`  | Satisfy the Postgres host requirement |
