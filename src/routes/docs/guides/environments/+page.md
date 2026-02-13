---
title: Environments
---

# Environments & Virtual Environments

Interlace supports multi-environment workflows (dev, staging, production) with shared source layers, connection access policies, and source caching. This enables "virtual environments" where development pipelines read production source data without re-fetching.

## The Problem

Many external APIs only have a single production endpoint. There is no `dev.github.com` or `staging.api.companieshouse.gov.uk`. Yet you need to:

- Develop pipeline logic against **real data** without hitting production APIs repeatedly
- Run the same pipeline in dev/staging/prod with appropriate data isolation
- Share expensive-to-acquire source data across environments
- Avoid redundant API calls that cost money and hit rate limits

## Environment Configuration

Interlace uses a file-based overlay pattern:

```
project/
├── config.yaml              # Base/default configuration
├── config.dev.yaml           # Dev environment overrides
├── config.staging.yaml       # Staging environment overrides
├── config.prod.yaml          # Production environment overrides
└── models/
```

**Resolution order** (later overrides earlier):

1. `config.yaml` (base/default)
2. `config.{env}.yaml` (environment-specific)
3. Environment variables (highest priority)

Run with a specific environment:

```bash
interlace run --env dev
interlace run --env prod
```

## Shared Source Layer

The core concept is a **shared source layer** -- a connection that stores source data independently of any environment. Source models write here once; all environments read from it.

```yaml
# config.yaml (base)
connections:
  # Shared source layer -- NOT per-environment
  sources:
    type: duckdb
    path: 'data/sources.duckdb'
    shared: true # Skips {env} substitution
    access: read # Read-only for non-prod environments

  # Per-environment working database
  default:
    type: duckdb
    path: 'data/{env}/main.duckdb' # {env} replaced at runtime
```

```yaml
# config.prod.yaml
connections:
  sources:
    access: readwrite # Only prod can write to sources
```

### How It Works

1. **Production** runs source models that fetch from APIs and write to the `sources` connection
2. **Dev/staging** read from `sources` automatically via fallback resolution
3. Transformation models write to each environment's own `default` connection
4. Zero API calls in dev -- instant startup with real data

## Connection Access Policies

Every connection supports two policy fields:

### `shared: true`

Shared connections skip `{env}` substitution in all string values. They are available to all environments and serve as the foundation for the shared source layer.

### `access: read | readwrite`

Controls whether write operations (CREATE TABLE, INSERT, etc.) are permitted:

- `readwrite` (default) -- full read/write access
- `read` -- only SELECT queries allowed; writes raise `ReadOnlyConnectionError`

```yaml
connections:
  prod_oltp:
    type: postgres
    access: read # Dev cannot accidentally write to prod
    shared: true
    config:
      host: prod-db.internal
      database: app_production
      user: ${PROD_DB_READONLY_USER}
      password: ${PROD_DB_READONLY_PASSWORD}
```

## Fallback Connection Resolution

When a model depends on a table that does not exist in the current environment, Interlace searches **fallback connections** before failing:

```yaml
environments:
  fallback_connections:
    - sources # Check shared sources first
```

Resolution order for each dependency:

1. Current environment's connection (the model's configured connection)
2. Each fallback connection in order
3. First match wins -- the table is loaded as an `ibis.Table`

If no explicit `fallback_connections` are configured, Interlace automatically uses all `shared: true` connections as fallbacks.

This is the "virtual environment" mechanism -- dev does not need its own copy of source data. It reads transparently from the shared layer.

## Source Caching with TTL

Source models can declare a **cache policy** to avoid re-fetching when data is still fresh:

```python
from interlace import model

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

### Cache Strategies

| Strategy      | Behaviour                                                           |
| ------------- | ------------------------------------------------------------------- |
| `"ttl"`       | Skip execution if last successful run was within the TTL period     |
| `"if_exists"` | Skip if the materialised table already exists (manual refresh only) |
| `"always"`    | Normal behaviour -- no caching                                      |

### TTL Format

TTL strings support human-readable durations:

- `"30s"` -- 30 seconds
- `"5m"` -- 5 minutes
- `"24h"` -- 24 hours
- `"7d"` -- 7 days
- `"2w"` -- 2 weeks

Cache is checked **after** change detection. If model code has changed, the cache is bypassed. Use `--force` to bypass both change detection and cache.

## Practical Examples

### Solo Developer

```yaml
# config.yaml
connections:
  sources:
    type: duckdb
    path: 'data/sources.duckdb'
    shared: true

  default:
    type: duckdb
    path: 'data/{env}/main.duckdb'

environments:
  fallback_connections:
    - sources
```

- Run `interlace run --env prod` to fetch sources
- Run `interlace run --env dev` to develop transformations against real data
- Zero infrastructure beyond the filesystem

### Team with Cloud Storage

```yaml
connections:
  sources:
    type: ducklake
    catalog: 'postgres:postgresql://${CATALOG_HOST}/interlace_catalog'
    data_path: 's3://${DATA_BUCKET}/sources/'
    shared: true
    access: read

  default:
    type: duckdb
    path: 'data/{env}/main.duckdb'
    attach:
      - name: sources
        type: ducklake
        catalog: 'postgres:postgresql://${CATALOG_HOST}/interlace_catalog'
        data_path: 's3://${DATA_BUCKET}/sources/'
        read_only: true
```

- Source data stored as Parquet on S3 via DuckLake
- DuckLake catalog in Postgres (shared, highly available)
- Any environment can ATTACH sources read-only
- Time travel for reproducible dev work

### Production-Only APIs

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

```python
@model(
    name="fca_register",
    tags=["source"],
    cache={"ttl": "7d"},
)
def fca_register():
    # Only called when cache expires
    api = API(base_url="https://register.fca.org.uk")
    return api.get("/services/search")
```

- FCA Register data fetched weekly
- All environments share the cached data
- Dev never hits the API
