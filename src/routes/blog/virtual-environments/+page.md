---
title: 'Virtual Environments: Share Source Data Without the Headaches'
date: 2026-02-05
author: Interlace Team
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Virtual Environments: Share Source Data Without the Headaches" date="2026-02-05" />

If you work with external APIs, you know the pain: there is no `dev.github.com`, no `staging.api.companieshouse.gov.uk`, no `test.register.fca.org.uk`. Production is the only endpoint. Yet you need to build, test, and iterate on pipelines that consume this data -- ideally without hammering the API on every `interlace run`.

Today we are releasing **virtual environments** in Interlace: a shared source layer architecture that lets you fetch data once and share it across dev, staging, and production environments with zero re-fetching, full isolation, and built-in safety.

## The Problem

Consider a typical data pipeline that integrates with the FCA Financial Services Register:

```python
@model(name="fca_register", tags=["source"])
def fca_register():
    api = API(base_url="https://register.fca.org.uk")
    return api.get("/services/search")
```

In production, this fetches fresh data. But what happens when you run `interlace run --env dev`?

Without an environment strategy, you face several bad options:

1. **Hit the API every time** -- slow, costs money, rate limits
2. **Manually copy production data** -- error-prone, stale data, tedious
3. **Skip source models in dev** -- but then your transformations have no data
4. **Mock the data** -- maintenance nightmare, does not catch schema changes

None of these are good. They all create friction between development velocity and data accuracy.

## The Shared Source Layer

Interlace introduces a three-tier architecture:

```
External APIs (GitHub, FCA, SFTP)
        |
        | cached fetch (TTL-controlled)
        v
   Shared Source Layer  (shared: true, access: read)
        |
        | fallback resolution (zero-copy)
        v
   Environment Layer  (dev / staging / prod)
```

**Source models** fetch from external APIs and write to a shared connection. **Transformation models** read from whatever environment they are running in, with automatic fallback to the shared layer.

### Configuration

```yaml
# config.yaml (base)
connections:
  sources:
    type: duckdb
    path: 'data/sources.duckdb'
    shared: true
    access: read

  default:
    type: duckdb
    path: 'data/{env}/main.duckdb'

environments:
  fallback_connections:
    - sources
```

```yaml
# config.prod.yaml
connections:
  sources:
    access: readwrite # Only production can write to sources
```

With this setup:

- `interlace run --env prod` fetches source data and writes to `sources.duckdb`
- `interlace run --env dev` reads from `sources.duckdb` automatically via fallback resolution
- Dev never hits external APIs. Zero API calls. Instant startup.

## Source Caching with TTL

Not every production run needs to re-fetch source data. The `cache` parameter lets you control this:

```python
@model(
    name="companies_house_officers",
    tags=["source"],
    connection="sources",
    cache={"ttl": "7d", "strategy": "ttl"},
)
def companies_house_officers():
    api = API(base_url="https://api.company-information.service.gov.uk")
    return api.get("/officers")
```

If the last successful run was within the TTL (7 days in this case), Interlace skips execution entirely. The existing data is used as-is. This works in production too -- if Companies House data only needs weekly refreshes, you save API calls and execution time.

TTL strings are human-readable: `"30s"`, `"5m"`, `"24h"`, `"7d"`, `"2w"`.

## Connection Access Policies

Safety is built in. Connections support `access` and `shared` fields:

```yaml
connections:
  prod_oltp:
    type: postgres
    access: read # Dev cannot accidentally write here
    shared: true
    config:
      host: prod-db.internal
      database: app_production
```

If any model tries to write to a `read` connection, Interlace raises a clear `ReadOnlyConnectionError`. This means dev environments can safely read production data without risk of accidental mutations.

## Fallback Connection Resolution

The "virtual" part of virtual environments is **fallback connection resolution**. When a model depends on a table that does not exist in the current environment, Interlace searches fallback connections before failing:

1. Check current environment's connection
2. Check each fallback connection in order
3. First match wins

This is transparent to models -- they do not need to know which connection provides each dependency. A model that depends on `fca_register` will find it in the shared source layer automatically, whether it is running in dev, staging, or production.

For debugging, Interlace tracks which connection satisfied each dependency. You can inspect this in the execution logs or (coming soon) in the UI.

## DuckDB Federation and DuckLake

For teams that need more than local DuckDB files, the shared source layer works beautifully with DuckDB's federation capabilities:

### Cross-File ATTACH

```yaml
connections:
  default:
    type: duckdb
    path: 'data/{env}/main.duckdb'
    attach:
      - name: sources
        type: duckdb
        path: 'data/sources.duckdb'
        read_only: true
```

DuckDB ATTACH makes the source database available as a named schema in your queries. Cross-database JOINs work transparently.

### DuckLake for Teams

DuckLake is a lakehouse format that stores data as Parquet files with a SQL-based metadata catalog. It is ideal for the shared source layer in team environments:

```yaml
connections:
  sources:
    type: ducklake
    catalog: 'postgres://catalog-host/interlace_catalog'
    data_path: 's3://data-lake/sources/'
    shared: true
    access: read
```

Benefits:

- **Time travel** -- query source data at any point in time for reproducible development
- **S3 storage** -- shared across team members without passing DuckDB files around
- **Schema evolution** -- automatic schema change tracking
- **Snapshots** -- name a version of your source data for regression testing

## Multi-Backend Support

Along with virtual environments, we are expanding Interlace's backend support to 20+ databases. Any ibis-supported backend can be used as a connection:

```yaml
connections:
  snowflake_wh:
    type: snowflake
    config:
      account: myorg-myaccount
      database: ANALYTICS
      warehouse: COMPUTE_WH
```

DuckDB and PostgreSQL remain specialised with unique features (ATTACH, WAL, connection pooling). For everything else, the generic `IbisConnection` handles backend-specific imports and connection setup automatically. Install the extra you need and go:

```bash
pip install 'ibis-framework[snowflake]'
```

## What's Next

- **`interlace promote`** -- a CLI command for copying or snapshotting data between environments
- **UI support** -- environment switcher, cache status indicators, and fallback resolution tracing in the Interlace dashboard
- **Config overlay merging** -- deep merge of `config.{env}.yaml` files with the base config
- **DuckLake integration testing** -- comprehensive test suite for the time-travel and snapshot workflows

Virtual environments are available now in the latest version of Interlace. Check out the [Environments guide](/docs/guides/environments) and [Multi-Backend Connections guide](/docs/guides/multi-backend) for complete documentation.
