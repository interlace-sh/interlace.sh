---
title: Introducing Interlace
date: 2026-02-01
author: Interlace Team
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Introducing Interlace" date="2026-02-01" />

We are excited to announce **Interlace**, a unified data pipeline framework that brings the best ideas from the modern data stack into a single, cohesive tool. Today we are releasing the first public version.

Interlace lets you define, orchestrate, and monitor data pipelines using a single `@model` decorator — ingestion, transformation, Python and SQL, against any backend, with built-in scheduling, change detection, and observability. No external orchestrator required.

## Why Interlace

Modern data teams face a fragmented landscape. Each tool solves one piece of the puzzle well, but the seams between them create real costs:

### Transformation

- **dbt** established the SQL transformation standard and has a massive ecosystem, but Python model support is limited to certain platforms. It requires an external orchestrator for production scheduling, and column-level lineage is locked behind dbt Cloud Enterprise.
- **SQLMesh** brings excellent change detection, virtual environments, and a plan/apply workflow — but is SQL-first with more limited Python support and a smaller community.

### Orchestration

- **Apache Airflow** is battle-tested at scale with an enormous operator ecosystem. Airflow 3 introduced Assets for data-aware scheduling, and OpenLineage provides lineage — but it still has no built-in transformation semantics and requires heavy infrastructure.
- **Dagster** offers a modern developer experience with software-defined assets and strong typing, but the multiple abstraction layers (assets, ops, jobs, resources) create a steep learning curve for straightforward pipeline work.
- **Prefect** provides a clean, Pythonic API with minimal boilerplate, but is general-purpose — it has no data-specific awareness, transformation semantics, or lineage tracking.

### Ingestion

- **dlt** is excellent at Python-native data loading with automatic schema inference and incremental loading. It is focused on extraction and loading — you still need a separate tool for transformation and orchestration.

### The common pattern

Most teams end up combining two or three of these tools, each with its own learning curve, configuration, and deployment story. A dlt pipeline loads data into a warehouse, dbt transforms it, and Airflow schedules both — but the handoffs between them are implicit and fragile. Testing, lineage, and monitoring are scattered across different systems.

Interlace takes a different approach: one abstraction that handles ingestion, transformation, and orchestration natively. Tools like dlt and Snowflake are complementary — you can use dlt inside a model for extraction, or target Snowflake as a backend via ibis — but you no longer need separate tools for the core workflow of building, testing, and running data pipelines.

## The @model Decorator

Everything in Interlace starts with `@model`. A model is a function that takes input tables and returns an output table:

```python
from interlace import model
import ibis

@model(name="active_users", materialize="table")
def active_users(users: ibis.Table) -> ibis.Table:
    return users.filter(users.status == "active")
```

From this single definition, Interlace derives the dependency graph (the `users` parameter is an upstream model), handles materialization, and schedules execution. The same works for SQL:

```sql
-- models/active_users.sql
-- @model(name="active_users", materialize="table")
SELECT * FROM users WHERE status = 'active'
```

No special `ref()` syntax required — Interlace parses your `FROM` and `JOIN` clauses to detect dependencies automatically.

Python models can depend on SQL models and vice versa. The dependency graph is language-agnostic.

## Key Features

### Built-in Orchestration

No Airflow. No Dagster. No cron jobs calling scripts. Interlace includes a scheduler that supports both cron expressions and interval-based execution:

```python
@model(
    name="daily_revenue",
    materialize="table",
    schedule="0 6 * * *"  # Every day at 6am
)
def daily_revenue(orders: ibis.Table) -> ibis.Table:
    return (
        orders
        .filter(orders.created_at >= ibis.now() - ibis.interval(days=1))
        .agg(total=orders.amount.sum())
    )
```

Run `interlace serve` and your pipelines execute on schedule. For development, `interlace run` executes everything once.

### Multi-Backend Support

Develop locally with DuckDB, deploy to PostgreSQL, or run against Snowflake — the same model code works across backends. Interlace uses [Ibis](https://ibis-project.org) under the hood, which means your transformations compile to the native SQL dialect of whatever database you point them at.

```yaml
# config.yaml — development
connections:
  default:
    type: duckdb
    path: 'data/dev.duckdb'
```

```yaml
# config.prod.yaml — production
connections:
  default:
    type: postgres
    config:
      host: prod-db.internal
      database: analytics
```

### Smart Change Detection

Interlace tracks whether models need to re-run using configurable change detection strategies:

- **File hash**: Re-run when the model's source code changes
- **Upstream**: Re-run when any upstream dependency has changed
- **Schema**: Re-run when the output table's schema no longer matches

This means `interlace run` only executes what has actually changed — saving time on large pipelines.

### Materialization Strategies

Choose how each model persists its output:

- **`table`**: Drop and recreate (simple, reliable)
- **`append`**: Insert new rows without touching existing data
- **`merge_by_key`**: Upsert based on a primary key — ideal for slowly changing dimensions
- **`view`**: No persistence, just a named query

```python
@model(
    name="customers",
    materialize="table",
    strategy="merge_by_key",
    primary_key=["customer_id"]
)
def customers(raw_customers: ibis.Table) -> ibis.Table:
    return raw_customers.select("customer_id", "name", "email", "updated_at")
```

## Getting Started

Install Interlace and scaffold a new project:

```bash
pipx install interlace
interlace init my-pipeline
cd my-pipeline
interlace run
```

The scaffolded project includes example models in both Python and SQL, a DuckDB connection, and a `config.yaml` to get you running immediately.

## What's Next

We are just getting started. Here is what is on the roadmap:

- **Streaming ingestion** with a `@stream` decorator for real-time data sources
- **Virtual environments** with shared source layers and fallback resolution for multi-environment workflows
- **Enhanced testing framework** with built-in assertions, data quality checks, and snapshot testing
- **Incremental processing** with cursor-based execution for large datasets
- **Environment promotion** workflows for safely moving data between dev, staging, and production

We would love your feedback. Try Interlace and let us know what you think on [GitHub](https://github.com/interlace-sh/interlace), or dive into the [documentation](/docs) to explore the full feature set.
