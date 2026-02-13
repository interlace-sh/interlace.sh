---
title: Core Concepts
---

# Core Concepts

Understanding the fundamental concepts behind Interlace.

## Overview

Interlace is built around a few key concepts:

1. **Models** - The fundamental unit of transformation
2. **Materialization** - How model results are persisted
3. **Strategies** - Patterns for updating materialized data
4. **Dependencies** - How models relate to each other

## The @model Decorator

Everything in Interlace revolves around the `@model` decorator:

```python
@model(
    name="my_model",           # Unique identifier
    materialize="table",       # How to persist (table, view, ephemeral)
    strategy="merge_by_key",   # How to update (optional)
    primary_key=["id"]         # For merge strategies
)
def my_model(dependency: ibis.Table) -> ibis.Table:
    return dependency.filter(...)
```

## Execution Flow

When you run `interlace run`:

1. **Discovery** - Interlace scans for Python `@model` decorators and SQL files
2. **Graph Building** - Dependencies are resolved and a DAG is constructed
3. **Execution** - Models run in parallel where possible, respecting dependencies
4. **Materialization** - Results are persisted according to each model's configuration

## Learn More

- [Models](/docs/core-concepts/models) - Deep dive into model definitions
- [Materialization](/docs/core-concepts/materialization) - Persistence strategies
- [Strategies](/docs/core-concepts/strategies) - Update patterns
- [Dependencies](/docs/core-concepts/dependencies) - How models connect
