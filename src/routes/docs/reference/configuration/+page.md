---
title: Configuration Reference
---

# Configuration Reference

Complete reference for `config.yaml`.

## Basic Structure

```yaml
name: my-pipeline

connections:
  default:
    type: duckdb
    path: ./data/warehouse.duckdb

models:
  default_schema: public
  default_materialize: table
  default_strategy: replace
```

## Connection Settings

### Common Fields

All connections support these fields:

```yaml
connections:
  my_connection:
    type: duckdb # Required: backend type
    access: readwrite # Optional: "read" or "readwrite" (default)
    shared: false # Optional: true to share across environments
```

### DuckDB

```yaml
connections:
  default:
    type: duckdb
    path: ./data/warehouse.duckdb # Path to database file, or ":memory:"
    attach: # Optional: attach external databases
      - name: pg_db
        type: postgres
        read_only: true
        config:
          host: localhost
          database: mydb
```

### PostgreSQL

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
    health_check:
      enabled: true
      interval: 60.0
```

### Generic ibis Backends

Any ibis-supported backend (Snowflake, BigQuery, MySQL, etc.):

```yaml
connections:
  snowflake_wh:
    type: snowflake
    config:
      account: myorg-myaccount
      user: ${SNOWFLAKE_USER}
      password: ${SNOWFLAKE_PASSWORD}
      database: ANALYTICS
      warehouse: COMPUTE_WH
```

Install the required extra: `pip install 'ibis-framework[snowflake]'`

### DuckDB ATTACH Types

```yaml
attach:
  # PostgreSQL
  - name: pg_db
    type: postgres
    read_only: true
    config: { host: ..., database: ..., user: ..., password: ... }

  # MySQL
  - name: mysql_db
    type: mysql
    read_only: true
    config: { host: ..., database: ..., user: ..., password: ... }

  # SQLite
  - name: sqlite_db
    type: sqlite
    path: ./data/local.sqlite
    read_only: true

  # Another DuckDB file
  - name: shared_db
    type: duckdb
    path: ./data/sources.duckdb
    read_only: true

  # DuckLake (lakehouse with time travel)
  - name: lakehouse
    type: ducklake
    catalog: 'postgres:postgresql://host/catalog_db'
    data_path: 's3://bucket/path/'
    read_only: true
```

## Model Settings

```yaml
models:
  default_schema: public # Default schema for models
  default_materialize: table # Default materialisation type
  default_strategy: replace # Default strategy
```

### Model Decorator Parameters

See the [Models](/docs/core-concepts/models) and [API Reference](/docs/reference/api) pages for the full list of `@model` parameters.

```python
@model(
    name="model_name",                   # Model name (defaults to function name)
    schema="public",                      # Schema/database name
    connection="default",                 # Connection name from config
    materialise="table",                  # "table", "view", "ephemeral", "none"
    strategy="merge_by_key",              # "replace", "append", "merge_by_key", "scd_type_2", "none"
    primary_key="id",                     # Primary key column(s)
    tags=["source"],                      # Tags for organisation
    cache={"ttl": "7d", "strategy": "ttl"},  # Source cache policy
    schema_mode="safe",                   # "strict", "safe", "flexible", "lenient", "ignore"
    quality_checks=[...],                 # Quality checks (see Quality Checks guide)
    cursor="event_id",                    # Cursor column for incremental processing
    schedule={"cron": "0 * * * *"},       # Cron or interval scheduling
    export={"format": "csv", "path": "..."}, # Export after materialisation
    retry_policy=RetryPolicy(...),        # Retry config for transient failures
)
```

### Cache Configuration

```python
cache={
    "ttl": "7d",              # Time-to-live: "30s", "5m", "24h", "7d", "2w"
    "strategy": "ttl",        # "ttl", "if_exists", or "always"
}
```

## Environment Settings

```yaml
environments:
  source_connection: sources # Connection for shared source data
  fallback_connections: # Connections to search for missing deps
    - sources
```

## State Management

```yaml
state:
  connection: default # Which connection stores state
  schema: interlace # Schema for state tables
```

## Retry Policies

```yaml
retry:
  default_policy:
    max_attempts: 3
    initial_delay: 1.0
    max_delay: 30.0
    backoff_multiplier: 2.0
    jitter: true
  circuit_breaker:
    failure_threshold: 5
    recovery_timeout: 60.0
  dlq:
    enabled: true
    persist_to_db: true
```

## Quality Checks

```yaml
quality:
  enabled: true
  fail_on_error: false       # Stop pipeline on error-severity failures
  checks:
    users:
      - type: not_null       # Verify no NULLs
        column: id
        severity: error
      - type: unique         # Verify uniqueness
        column: email
      - type: accepted_values
        column: status
        values: [active, inactive, pending]
    orders:
      - type: row_count      # Verify row count range
        min_count: 100
        severity: warn
      - type: freshness      # Verify data recency
        column: created_at
        max_age_hours: 24
      - type: expression     # Custom SQL expression
        expression: "amount > 0"
```

Check types: `not_null`, `unique`, `accepted_values`, `row_count`, `freshness`, `expression`. See the [Quality Checks](/docs/guides/quality-checks) guide for details.

## Service (Authentication & Rate Limiting)

```yaml
service:
  auth:
    enabled: true
    api_keys:
      - name: "production"
        key: "${INTERLACE_API_KEY}"
        permissions: [read, write, execute]
      - name: "monitoring"
        key: "${MONITORING_KEY}"
        permissions: [read]
    whitelist:                  # Paths that skip authentication
      - /health
      - /api/docs
      - /api/openapi.yaml
    rate_limit:
      requests_per_second: 100
      burst: 200               # Token bucket burst capacity
```

See the [REST API & Service](/docs/guides/rest-api) guide for endpoint documentation.

## Scheduler

```yaml
scheduler:
  enabled: true
  timezone: UTC
```

Models with a `schedule` parameter are automatically registered with the background scheduler when running `interlace serve`.

## Observability

```yaml
observability:
  metrics:
    enabled: true
    port: 9090
  tracing:
    enabled: true
    exporter: console
  logging:
    format: human
    level: INFO
```

## Environment Variables

Reference environment variables with `${VAR_NAME}`:

```yaml
connections:
  warehouse:
    type: postgres
    config:
      password: ${DB_PASSWORD}
      port: ${DB_PORT:-5432} # With default value
```

The `{env}` placeholder is replaced with the active environment name:

```yaml
connections:
  default:
    type: duckdb
    path: data/{env}/main.duckdb # data/dev/main.duckdb, data/prod/main.duckdb
```

Connections with `shared: true` skip `{env}` substitution.

## Environment Overlays

Create environment-specific config files:

```
config.yaml           # Base configuration
config.dev.yaml       # Dev overrides
config.staging.yaml   # Staging overrides
config.prod.yaml      # Production overrides
```

Run with: `interlace run --env dev`

Environment files are deep-merged with the base config.
