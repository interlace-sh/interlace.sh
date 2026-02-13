---
title: API Reference
---

# API Reference

Python API for programmatic access.

## Basic Usage

```python
from interlace import run, run_sync

# Async execution
async def main():
    result = await run(
        config_path="./config.yaml",
        task="my_model"
    )

# Sync execution
result = run_sync(
    config_path="./config.yaml",
    task="my_model"
)
```

## Core Functions

### run()

```python
async def run(
    config_path: str = "./config.yaml",
    task: str | None = None,
    downstream: bool = False,
    full_refresh: bool = False,
    connection: str | None = None
) -> RunResult
```

Async execution of the pipeline.

### run_sync()

```python
def run_sync(
    config_path: str = "./config.yaml",
    task: str | None = None,
    downstream: bool = False,
    full_refresh: bool = False,
    connection: str | None = None
) -> RunResult
```

Synchronous wrapper for `run()`.

## The @model Decorator

```python
from interlace import model

@model(
    name: str,                          # Required: unique model name
    materialize: str = "table",         # "table", "view", "ephemeral"
    strategy: str = "replace",          # "replace", "append", "merge_by_key"
    primary_key: list[str] | None = None,  # For merge_by_key
    tags: list[str] = []                # Optional tags
)
def my_model(...) -> ibis.Table:
    ...
```

## RunResult

```python
class RunResult:
    success: bool
    models_run: list[str]
    errors: list[Error]
    duration_seconds: float
```
