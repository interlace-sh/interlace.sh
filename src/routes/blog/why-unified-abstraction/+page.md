---
title: Why We Built a Unified Abstraction
date: 2026-01-28
author: Interlace Team
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Why We Built a Unified Abstraction" date="2026-01-28" />

Modern data teams are drowning in tools. A typical stack in 2026 might include dbt for SQL transformations, Airflow or Dagster for orchestration, dlt or Airbyte for ingestion, custom Python scripts for anything dbt cannot express, and a growing pile of glue code to connect it all. Each tool brings its own configuration syntax, deployment model, testing framework, and monitoring approach. The result is that data engineers spend more time managing tools than building pipelines.

We built Interlace because we believe there is a better way. A single `@model` abstraction that handles transformations, orchestration, and materialization — regardless of whether you write Python or SQL.

## The Fragmentation Problem

Consider what happens when a data engineer joins a new team today. Before writing a single transformation, they need to learn:

- **dbt** for SQL models, sources, tests, and macros
- **Airflow** or **Dagster** for scheduling, sensors, and retry logic
- **dlt**, **Airbyte**, or **Fivetran** for data ingestion
- **Python scripts** for transformations that do not fit SQL
- **Spark** or **Pandas** for heavier processing
- **Custom YAML/JSON** for pipeline configuration

Each tool solves one piece of the puzzle well, but the seams between them create real costs. While dbt supports both SQL and Python models, Python support is limited to certain platforms, and you still need an orchestrator to bridge dbt with ingestion and other pipeline stages. Your ingestion layer (dlt, Airbyte) writes to a landing zone that your transformation layer (dbt) reads from — but the handoff is implicit and fragile. Testing a dbt model uses one framework; testing a Python script uses another; testing a dlt pipeline uses yet another. Deploying dbt is one workflow; deploying Dagster is a completely different one.

These are not hypothetical problems. When tools do not share context, failures fall through the cracks — stale data goes unnoticed, upstream failures silently cascade, and debugging means jumping between dashboards that each tell part of the story.

## Lessons from Software Engineering

Software engineering solved similar fragmentation problems decades ago through abstraction:

- **Functions** unified computation — you do not need different tools for arithmetic vs. string processing
- **Interfaces** decoupled implementation from usage — callers do not need to know how something works internally
- **Package managers** unified dependency resolution — no more manual dependency tracking

Data engineering is following the same arc, just a decade behind. We are still in the era where each concern (transformation, orchestration, testing, deployment) has a dedicated tool with its own mental model.

## The @model Abstraction

Interlace is built around a single idea: a **model** is a function that takes zero or more input tables and returns one output table, with metadata about how to persist and update the result.

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
    return (
        orders
        .join(customers, "customer_id")
        .group_by("customer_id")
        .agg(
            total_spend=orders.amount.sum(),
            order_count=orders.amount.count(),
            first_order=orders.created_at.min(),
        )
    )
```

This is a complete pipeline step. No YAML configuration. No separate orchestration definition. No external scheduler. From this single decorator, Interlace derives:

- **Dependencies**: The function parameters `customers` and `orders` are upstream models — Interlace builds the DAG automatically
- **Materialization**: `materialize="table"` means Interlace creates or replaces the output table
- **Update strategy**: `merge_by_key` on `customer_id` means incremental updates merge into existing rows
- **Execution order**: Topological sort of the dependency graph determines when this model runs

The same abstraction works for SQL:

```sql
-- models/active_users.sql
-- @model(name="active_users", materialize="table")
SELECT * FROM users WHERE status = 'active'
```

No `ref()` function needed — Interlace parses your `FROM` and `JOIN` clauses to build the dependency graph automatically.

The same abstraction extends to ingestion. A model with no input parameters is a source — it pulls data in from the outside world:

```python
@model(
    name="raw_events",
    materialize="table",
    strategy="append",
)
def raw_events():
    import httpx
    response = httpx.get("https://api.example.com/events")
    return response.json()  # list of dicts → Interlace converts automatically
```

This is just a Python function that returns data. You can use `httpx`, dlt, a CSV reader, or anything else — the `@model` interface stays the same. Downstream models depend on `raw_events` like any other model. No separate ingestion config, no implicit handoff between tools, and the same testing pattern applies.

Python models can depend on SQL models. SQL models can depend on Python models. Ingestion models feed into transformation models. The interface is the same.

## What This Unlocks

### Ingestion as a First-Class Citizen

Most tools treat ingestion as a separate concern. You configure Airbyte connectors or write dlt pipelines, then hope the data lands where your transformations expect it. With Interlace, ingestion is just another model — it participates in the same DAG, the same lineage graph, and the same testing framework. When an API changes its response format, you find out in the same place you find out about a broken join.

Tools like dlt are excellent at what they do — schema inference, incremental loading, and normalization. Interlace does not try to replace them. Instead, you can use dlt *inside* a model, getting the best of both worlds: dlt handles the extraction mechanics while Interlace handles the orchestration, dependencies, and lineage.

### Reduced Cognitive Load

One abstraction replaces five tools. A new team member learns `@model` and can immediately read, write, and debug any pipeline step — ingestion, transformation, Python, or SQL.

### Natural Composability

Because every model has the same shape (tables in, table out), composition is trivial. You do not need adapters, bridges, or glue code to connect Python and SQL transformations.

### Consistent Testing

One testing pattern works everywhere. Mock the input tables, call the function, assert on the output. No separate testing frameworks for SQL vs. Python.

```python
def test_customer_lifetime_value():
    customers = [
        {"customer_id": 1, "name": "Alice"},
        {"customer_id": 2, "name": "Bob"},
    ]
    orders = [
        {"customer_id": 1, "amount": 100, "created_at": "2026-01-01"},
        {"customer_id": 1, "amount": 200, "created_at": "2026-01-15"},
        {"customer_id": 2, "amount": 50, "created_at": "2026-01-10"},
    ]
    result = customer_lifetime_value(customers, orders)
    assert result.count().execute() == 2
```

### Backend Portability

The same model runs on DuckDB during development and PostgreSQL in production. Ibis's deferred execution means your transformation logic is not coupled to a specific database.

## The Road Ahead

We are not claiming Interlace replaces every tool in every scenario. dbt has a massive ecosystem. Airflow handles complex cross-system orchestration. dlt is excellent at data loading. Spark processes data at scales Interlace is not designed for.

But for the core workflow of building, testing, and running data transformations — the work data engineers do every day — we believe a unified abstraction is simpler, faster, and more reliable than stitching together multiple tools.

[Get started with Interlace](/docs/getting-started) or explore the [documentation](/docs) to see how the `@model` abstraction works in practice.
