---
title: API Reference
---

# API Reference

Python API for programmatic access.

## Basic Usage

```python
from interlace import run

# Works in both sync and async contexts (auto-detected)
results = run()                     # Sync — blocks until complete
results = await run()               # Async — returns coroutine

# Run specific models
results = run(models=["users", "orders"])

# Force re-execution (bypass change detection)
results = run(force=True)

# Backfill a date range
results = run(since="2024-01-01", until="2024-06-30")
```

## Core Functions

### run()

```python
from interlace import run

results = run(
    models=None,            # Models to run (None = all)
    project_dir=None,       # Project directory (default: cwd)
    env=None,               # Environment name (default: INTERLACE_ENV or "dev")
    verbose=False,          # Enable verbose output
    since=None,             # Backfill start bound (overrides cursor)
    until=None,             # Backfill end bound
    force=False,            # Force re-execution (bypass change detection)
)
```

Auto-detects sync/async context. Call `run()` from sync code or `await run()` from async code.

**Parameters:**

| Parameter     | Type                                           | Default | Description                                      |
| ------------- | ---------------------------------------------- | ------- | ------------------------------------------------ |
| `models`      | `list[str \| Callable] \| str \| Callable \| None` | `None`  | Models to run. `None` runs all discovered models |
| `project_dir` | `Path \| None`                                 | `None`  | Project directory (defaults to current directory) |
| `env`         | `str \| None`                                  | `None`  | Environment name                                 |
| `verbose`     | `bool`                                         | `False` | Enable verbose output                            |
| `since`       | `str \| None`                                  | `None`  | Override cursor start for backfill               |
| `until`       | `str \| None`                                  | `None`  | Upper bound for backfill window                  |
| `force`       | `bool`                                         | `False` | Force re-execution, bypassing change detection   |

**Returns:** `dict[str, Any]` — dictionary mapping model names to execution results:

```python
{
    "users": {
        "status": "success",    # "success", "skipped", or "failed"
        "rows": 1000,
        "duration": 2.5,
    },
    "orders": {
        "status": "success",
        "rows": 5000,
        "duration": 1.2,
    },
}
```

**Models parameter formats:**

```python
# Run all models
run()

# Single model by name
run(models="users")

# Multiple models by name
run(models=["users", "orders"])

# Model functions directly
run(models=[users, orders])

# Mixed
run(models=["users", orders_func])
```

When specific models are requested, their upstream dependencies are automatically included.

### run_sync()

```python
from interlace import run_sync

results = run_sync(
    models=None,
    project_dir=None,
    env=None,
    verbose=False,
)
```

Explicitly synchronous wrapper. Use when you need to force synchronous execution even from an async context. Same parameters as `run()`.

## The @model Decorator

```python
from interlace import model

@model(
    name="my_model",                         # Model name (defaults to function name)
    schema="public",                          # Schema/database name
    connection=None,                          # Connection name from config
    materialise="table",                      # "table", "view", "ephemeral", "none"
    strategy=None,                            # "replace", "append", "merge_by_key", "scd_type_2", "none"
    primary_key=None,                         # Key column(s) for merge/SCD strategies
    dependencies=None,                        # Explicit dependencies (auto-detected if None)
    tags=None,                                # Tags for organisation, e.g. ["source"]
    description=None,                         # Human-readable description
    owner=None,                               # Owner/team identifier
    fields=None,                              # Schema definition: {"col": "type"}
    strict=False,                             # Drop columns not in fields
    column_mapping=None,                      # Rename columns: {"old": "new"}
    schema_mode="safe",                       # "strict", "safe", "flexible", "lenient", "ignore"
    cache=None,                               # Cache policy: {"ttl": "7d", "strategy": "ttl"}
    retry_policy=None,                        # RetryPolicy for transient failures
    schedule=None,                            # Schedule: {"cron": "0 * * * *"} or {"every_s": "600"}
    export=None,                              # Export: {"format": "csv", "path": "output/report.csv"}
    cursor=None,                              # Cursor column for incremental processing
    quality_checks=None,                      # Quality checks: [{"type": "not_null", "column": "id"}]
    incremental=None,                         # Incremental config
)
def my_model(dependency: ibis.Table) -> ibis.Table:
    return dependency.filter(...)
```

### Return Types

Model functions can return any of:

| Return Type        | Behaviour                                      |
| ------------------ | ---------------------------------------------- |
| `ibis.Table`       | Passed through to materialisation directly     |
| `pandas.DataFrame` | Converted to ibis table                        |
| `list[dict]`       | Converted to table, e.g. `[{"id": 1}, ...]`   |
| `dict`             | Single row, e.g. `{"id": 1, "name": "Alice"}` |
| `None`             | Side-effect model (no output table)            |
| generator          | All yielded values collected into a table      |

## Context Functions

Use inside model functions to access the current connection:

```python
from interlace import model, sql
from interlace.core.context import get_connection

@model(name="custom_query")
def custom_query():
    # Get the current connection
    conn = get_connection()
    table = conn.table("my_table")

    # Or execute raw SQL
    result = sql("SELECT * FROM my_table WHERE active = true")
    return result
```

### get_connection()

Returns the ibis connection for the current model execution context.

### sql(query)

Execute a raw SQL query and return the result as an `ibis.Table`.

## API Client

Built-in HTTP client for ingesting data from REST APIs. Provides automatic retry, rate limiting, pagination, concurrency control, and conversion to `ibis.Table`.

```python
from interlace import model, API

api = API(base_url="https://api.example.com", max_concurrent=10)

@model(name="users", materialise="table")
async def users():
    async with api:
        return await api.get("/users")
```

### Constructor

```python
API(
    base_url="https://api.example.com",
    headers=None,               # Default headers for all requests
    auth=None,                  # Async auth function (see Authentication)
    max_concurrent=10,          # Max parallel requests
    max_retries=5,              # Retry attempts for failed requests
    retry_delay=1.0,            # Base delay between retries (seconds)
    timeout=120,                # Request timeout (seconds)
    convert_camel_case=True,    # Convert camelCase keys to snake_case
    rate_limit=None,            # Max requests per interval (e.g. 10)
    rate_limit_interval=1.0,    # Rate limit interval in seconds
)
```

**Parameters:**

| Parameter             | Type                          | Default | Description                                                   |
| --------------------- | ----------------------------- | ------- | ------------------------------------------------------------- |
| `base_url`            | `str`                         | —       | Base URL for all requests                                     |
| `headers`             | `dict[str, str] \| None`     | `None`  | Default headers included in every request                     |
| `auth`                | `Callable \| None`            | `None`  | Async function receiving session, returning headers or token  |
| `max_concurrent`      | `int`                         | `10`    | Maximum parallel requests (semaphore)                         |
| `max_retries`         | `int`                         | `5`     | Retry attempts with exponential backoff                       |
| `retry_delay`         | `float`                       | `1.0`   | Base delay between retries in seconds                         |
| `timeout`             | `int`                         | `120`   | Request timeout in seconds                                    |
| `convert_camel_case`  | `bool`                        | `True`  | Auto-convert camelCase response keys to snake_case            |
| `rate_limit`          | `int \| None`                 | `None`  | Token bucket rate limit (requests per interval)               |
| `rate_limit_interval` | `float`                       | `1.0`   | Rate limit interval in seconds                                |

### Shared Instances

Define the `API` instance at module level to share rate limiting and concurrency across models:

```python
from interlace import model, API

# All models share this instance — global rate limit of 10 req/s
api = API(base_url="https://dummyjson.com", rate_limit=10)

@model(name="products", materialise="table")
async def products():
    async with api:
        return await api.paginated("/products", data_attribute="products",
            count_attribute="total", page_size=30,
            page_size_param="limit", page_param="skip")

@model(name="users", materialise="table")
async def users():
    async with api:
        return await api.paginated("/users", data_attribute="users",
            count_attribute="total", page_size=30,
            page_size_param="limit", page_param="skip")
```

The session is ref-counted — multiple models can enter `async with api:` concurrently and the session is only closed when the last model exits.

### Methods

#### get(url, ...)

```python
data = await api.get("/users", params={"active": True})
```

GET request. Returns `ibis.Table` by default.

#### post(url, ...)

```python
data = await api.post("/search", data={"query": "active users"})
```

POST request with JSON body.

#### request(url, method, ...)

```python
data = await api.request("/resource/123", method="PUT", data={"name": "updated"})
```

Generic request for any HTTP method (PUT, DELETE, PATCH, etc.).

#### paginated(url, ...)

```python
data = await api.paginated(
    "/products",
    page_size=100,              # Items per page
    page_size_param="pageSize", # Query param name for page size
    page_param="page",          # Query param name for page number
    count_attribute="meta.count", # Dot-path to total count in response
    data_attribute="data",      # Key containing the records
)
```

Fetches the first page, reads the total count, then fetches all remaining pages in parallel. Results are combined into a single `ibis.Table`.

| Parameter         | Type   | Default        | Description                                    |
| ----------------- | ------ | -------------- | ---------------------------------------------- |
| `page_size`       | `int`  | `100`          | Items per page                                 |
| `page_size_param` | `str`  | `"pageSize"`   | Query param name for page size                 |
| `page_param`      | `str`  | `"page"`       | Query param name for page number               |
| `count_attribute` | `str`  | `"meta.count"` | Dot-separated path to total count in response  |
| `data_attribute`  | `str`  | `"data"`       | Key containing the records array               |

#### batch(urls, ...)

```python
data = await api.batch(["/users/1", "/users/2", "/users/3"])
```

Parallel requests to multiple endpoints. Results are combined into a single `ibis.Table`.

### Common Parameters

All request methods (`get`, `post`, `request`, `paginated`, `batch`) accept:

| Parameter        | Type              | Default  | Description                                        |
| ---------------- | ----------------- | -------- | -------------------------------------------------- |
| `params`         | `dict \| None`    | `None`   | Query parameters                                   |
| `headers`        | `dict \| None`    | `None`   | Additional headers for this request                |
| `data_attribute` | `str \| None`     | `"data"` | Key to extract from response. `None` = full response |
| `dataframe`      | `bool`            | `True`   | Return `ibis.Table` (`True`) or raw `list`/`dict`  |

### Authentication

Pass an async `auth` function to the constructor. It receives the `aiohttp.ClientSession` and should return either a headers dict or a token string:

```python
from interlace import API
from interlace.utils.api import oauth2_token

api = API(
    base_url="https://api.example.com",
    auth=lambda session: oauth2_token(
        session,
        token_url="https://auth.example.com/token",
        client_id="my_client_id",
        client_secret="my_client_secret",
    ),
)
```

#### oauth2_token(session, token_url, client_id, client_secret, grant_type, scope)

OAuth2 client credentials flow. Returns the access token string, which is automatically set as a `Bearer` token header.

| Parameter       | Type            | Default                | Description              |
| --------------- | --------------- | ---------------------- | ------------------------ |
| `token_url`     | `str`           | —                      | OAuth2 token endpoint    |
| `client_id`     | `str`           | —                      | Client ID                |
| `client_secret` | `str`           | —                      | Client secret            |
| `grant_type`    | `str`           | `"client_credentials"` | OAuth2 grant type        |
| `scope`         | `str \| None`   | `None`                 | Optional scope           |

#### basic_auth_token(session, auth_url, username, password)

Legacy basic auth flow. Returns a headers dict with the token.

```python
from interlace.utils.api import basic_auth_token

api = API(
    base_url="https://api.example.com",
    auth=lambda session: basic_auth_token(
        session, "https://auth.example.com", "user", "pass"
    ),
)
```

## Testing Utilities

Interlace provides a testing framework for unit-testing models in isolation. See the [Testing guide](/docs/guides/testing) for full documentation.

```python
from interlace import test_model_sync, mock_dependency

result = test_model_sync(my_model, deps={
    "users": [{"id": 1, "name": "Alice"}],
})
assert result.status == "success"
assert result.row_count == 1
```
