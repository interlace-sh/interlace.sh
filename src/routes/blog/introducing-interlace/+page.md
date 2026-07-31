---
title: Introducing Interlace
date: 2026-07-30
author: Interlace Team
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Introducing Interlace" date="2026-07-30" />

We are excited to introduce **Interlace**, a Python/SQL-first data platform that brings transformation, orchestration, and durable streaming into a single process. Interlace is **1.0**, MIT-licensed, and requires Python 3.12+.

Interlace lets you define, orchestrate, and monitor data pipelines from `.sql` files and `@model` Python functions — with a terraform-style plan/apply workflow, built-in scheduling, change detection, and observability. No external orchestrator required.

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

Interlace takes a different approach: one abstraction that handles ingestion, transformation, and orchestration natively. Tools like dlt remain complementary — you can call one inside a model for extraction — but you no longer need separate tools for the core workflow of building, testing, and running data pipelines.

## The @model Decorator

Everything in Interlace starts with `@model`. A model is a function that takes input tables and returns an output table:

```python
from interlace import model

@model(materialise="table")
def active_users(users):
    return users.filter(users.status == "active")
```

From this single definition, Interlace derives the dependency graph (the `users` parameter is an upstream model), handles materialisation, and schedules execution. Data crosses the boundary as Arrow — never pandas — and is streamed with bounded memory. The same works for SQL, with config in a leading comment block:

```sql
-- models/active_users.sql
/* interlace:
  strategy: full
*/
SELECT * FROM users WHERE status = 'active'
```

No special `ref()` syntax required — Interlace parses your `FROM` and `JOIN` clauses to detect dependencies automatically.

Python models can depend on SQL models and vice versa. The dependency graph is language-agnostic.

## Key Features

### Built-in Orchestration

No Airflow. No Dagster. No cron jobs calling scripts. Interlace includes a scheduler that supports both cron expressions and interval-based execution:

```python
@model(
    materialise="table",
    schedule={"cron": "0 6 * * *"},  # Every day at 6am
)
def daily_revenue(orders):
    return orders.agg(total=orders.amount.sum())
```

Run `interlace serve` and the daemon runs the scheduler, HTTP API, stream ingestion, and web UI in one process. For development, `interlace apply --env dev` builds what changed; `interlace run` force-builds, ignoring change detection.

### Multi-Engine Support

Models run on **named engines**: DuckDB with DuckLake storage by default, and Postgres natively over ADBC. Models pin to an engine with `engine:`, strategies execute inside that engine rather than routing through a DuckDB middleman, and cross-engine dependencies show up as explicit transfer lines in the plan.

```yaml
# interlace.yaml
engines:
  pg: { type: postgres, database: '${PG_DSN}' }
```

```sql
/* interlace: {engine: pg, strategy: merge_by_key, key: id} */
SELECT id, tier, lifetime_value FROM account_summary
```

### Smart Change Detection

Interlace tracks whether models need to re-run using configurable change detection strategies:

- **File hash**: Re-run when the model's source code changes
- **Upstream**: Re-run when any upstream dependency has changed
- **Schema**: Re-run when the output table's schema no longer matches

This means `interlace apply` only executes what has actually changed — and column-pruned impact analysis goes further: a downstream model whose output is provably identical **reuses its existing table** instead of rebuilding.

### Strategies

Choose how each model persists its output:

- **`full`**: Rebuild the whole table (simple, reliable)
- **`view`**: No persistence, just a named query
- **`ephemeral`**: Inlined into downstream models as a CTE
- **`merge_by_key`**: Upsert based on a key
- **`full_merge`**: A full-state source applied as a minimal diff
- **`incremental_by_time`**: Windowed, with an interval ledger for backfill and catch-up
- **`scd_type_2`**: History with validity windows

```python
@model(
    materialise="table",
    strategy="merge_by_key",
    key="customer_id",
)
def customers(raw_customers):
    return raw_customers.select("customer_id", "name", "email", "updated_at")
```

## Getting Started

Install Interlace and scaffold a new project:

```bash
uv pip install "interlaced[service]"
interlace init my-pipeline
cd my-pipeline
interlace plan     # preview: added / breaking / non-breaking / reuse
interlace apply    # build changed models, run checks, promote
```

The package is published to PyPI as **`interlaced`**; the import name and CLI are `interlace`. The scaffolded project includes example models in both Python and SQL, a DuckDB/DuckLake warehouse, and an `interlace.yaml` to get you running immediately.

## What's Next

Everything described above ships in 1.0: durable streaming with `@stream`, environments with atomic promotion and rollback, data-quality checks that gate promotion, incremental and SCD strategies, and reverse-ETL sinks.

What we are focused on next:

- **Broadening engine support** beyond DuckDB/DuckLake and Postgres-over-ADBC
- **Deeper column-level lineage** in the web UI
- **Postgres as the control-plane backend** for scale-out deployments

We would love your feedback. Try Interlace and let us know what you think on [GitHub](https://github.com/interlace-sh/interlace), or dive into the [documentation](/docs) to explore the full feature set.
