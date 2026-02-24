---
title: Introduction
---

# Introduction to Interlace

Interlace is a unified data pipeline framework that lets you define, orchestrate, and monitor data transformations using a single `@model` abstraction.

## Why Interlace?

Modern data teams face a fragmented landscape of tools:

- **dbt** for SQL transformations, but limited Python support
- **Dagster** for orchestration, but separate from your transformation logic
- **Custom scripts** for Python transformations, with no built-in orchestration

Interlace unifies these concerns into a single, coherent framework.

## Key Features

### Unified Model Abstraction

Write your transformations in Python or SQL - Interlace handles both with the same `@model` decorator:

```python
from interlace import model
import ibis

@model(name="active_users", materialise="table")
def active_users(users: ibis.Table) -> ibis.Table:
    return users.filter(users.status == "active")
```

### Built-in Orchestration

Interlace automatically detects dependencies between models and executes them in the correct order with parallel execution where possible.

### Multiple Backends

Start with DuckDB for local development, deploy to Postgres for production - same code, different configuration.

## Next Steps

- [Install Interlace](/docs/getting-started/installation) to get started
- [Build your first model](/docs/getting-started/first-model) with a hands-on tutorial
- [Explore core concepts](/docs/core-concepts) to understand how Interlace works
