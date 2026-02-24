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
