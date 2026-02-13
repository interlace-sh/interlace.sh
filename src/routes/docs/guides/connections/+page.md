---
title: Connections
---

# Connections

Configure database connections for your pipelines. Interlace supports DuckDB and PostgreSQL as primary backends, with additional databases available via the ibis generic connection. DuckDB federation enables cross-database queries.

## Configuration File

Connections are defined in `config.yaml`:

```yaml
connections:
  default:
    type: duckdb
    path: ./data/warehouse.duckdb
```

## DuckDB (Default)

Perfect for local development and small to medium datasets:

```yaml
connections:
  default:
    type: duckdb
    path: ./data/warehouse.duckdb
```

### In-Memory DuckDB

For testing or ephemeral pipelines:

```yaml
connections:
  default:
    type: duckdb
    path: ':memory:'
```

## PostgreSQL

For production deployments with connection pooling:

```yaml
connections:
  warehouse:
    type: postgres
    config:
      host: localhost
      port: 5432
      database: mydb
      user: myuser
      password: ${POSTGRES_PASSWORD}
    pool:
      max_size: 10
      timeout: 30.0
```

## Other Backends

Interlace supports any ibis backend. See the [Multi-Backend Connections](/docs/guides/multi-backend) guide for Snowflake, BigQuery, MySQL, ClickHouse, and more.

## Environment Variables

Use `${VAR_NAME}` syntax to reference environment variables:

```yaml
connections:
  warehouse:
    type: postgres
    config:
      host: ${DB_HOST}
      database: ${DB_NAME}
      user: ${DB_USER}
      password: ${DB_PASSWORD}
```

With default values:

```yaml
connections:
  default:
    type: duckdb
    path: ${DATA_PATH:-./data/warehouse.duckdb}
```

## Multiple Connections

Define multiple connections for different purposes:

```yaml
connections:
  default:
    type: duckdb
    path: ./data/warehouse.duckdb

  production:
    type: postgres
    config:
      host: prod-db.example.com
      database: warehouse
      user: ${PROD_USER}
      password: ${PROD_PASSWORD}
```

Target a specific connection in your model:

```python
@model(name="reports", connection="production", materialise="table")
def reports(metrics: ibis.Table) -> ibis.Table:
    return metrics.filter(metrics.active)
```

## Connection Access Policies

Control read/write access per connection:

```yaml
connections:
  prod_source:
    type: postgres
    access: read # Read-only -- prevents accidental writes
    shared: true # Available across all environments
    config:
      host: prod-db.internal
      database: app_production
```

- `access: read` -- only SELECT queries allowed
- `access: readwrite` -- full access (default)
- `shared: true` -- connection skips `{env}` path substitution

## DuckDB ATTACH

Attach external databases to DuckDB for cross-database queries:

```yaml
connections:
  default:
    type: duckdb
    path: ./data/main.duckdb
    attach:
      - name: app_db
        type: postgres
        read_only: true
        config:
          host: localhost
          database: app_production
```

Supported ATTACH types: `postgres`, `mysql`, `sqlite`, `duckdb`, `ducklake`.

See the [Multi-Backend Connections](/docs/guides/multi-backend) guide for full ATTACH documentation.

## Environments

Use environment-specific config files for dev/staging/prod isolation. See the [Environments](/docs/guides/environments) guide for shared source layers, fallback resolution, and source caching.
