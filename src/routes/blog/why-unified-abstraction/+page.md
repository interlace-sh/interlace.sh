---
title: Why We Built a Unified Abstraction
date: 2026-01-28
author: Interlace Team
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Why We Built a Unified Abstraction" date="2026-01-28" />

Modern data teams are drowning in tools. Here is why we believe a unified `@model` abstraction is the future of data engineering.

## The Fragmentation Problem

Consider a typical data stack in 2026:

- **dbt** for SQL transformations
- **Airflow** or **Dagster** for orchestration
- **Python scripts** for complex transformations
- **Spark** for big data processing
- **Custom glue code** to connect everything

Each tool has its own:

- Configuration syntax
- Deployment model
- Testing framework
- Monitoring approach

The result? Data engineers spend more time managing tools than building pipelines.

## Lessons from Software Engineering

Software engineering solved similar problems decades ago with abstraction:

- **Functions** abstract computation
- **Classes** abstract state and behavior
- **Interfaces** abstract implementation details

Why should data engineering be different?

## The @model Abstraction

We designed Interlace around a single, powerful abstraction: the `@model` decorator.

A model is simply a function that:

1. Takes zero or more input tables
2. Returns one output table
3. Has metadata about how to persist and update the result

```python
@model(
    name="customer_lifetime_value",
    materialize="table",
    strategy="merge_by_key",
    primary_key=["customer_id"]
)
def customer_lifetime_value(
    customers: ibis.Table,
    orders: ibis.Table
) -> ibis.Table:
    # Your transformation logic
    ...
```

This simple abstraction handles:

- **Dependency management**: Parameters define dependencies
- **Materialization**: The decorator specifies how to persist
- **Update strategy**: Choose replace, append, or merge
- **Orchestration**: Interlace executes in the right order

## Benefits

### 1. Reduced Cognitive Load

Learn one abstraction instead of five tools.

### 2. Composability

Models compose naturally. Python models can depend on SQL models and vice versa.

### 3. Testability

One pattern to test, one mocking strategy, one assertion approach.

### 4. Portability

Same code runs on DuckDB locally and Postgres in production.

## The Future

We believe the future of data engineering is:

- **Simpler**: Fewer tools, more impact
- **Unified**: One abstraction for all transformations
- **Portable**: Run anywhere, from laptop to cloud

Interlace is our contribution to that future. [Try it today](/docs/getting-started).
