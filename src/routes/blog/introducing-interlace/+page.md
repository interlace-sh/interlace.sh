---
title: Introducing Interlace
date: 2026-02-01
author: Interlace Team
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Introducing Interlace" date="2026-02-01" />

We are excited to announce **Interlace**, a unified data pipeline framework that combines the best ideas from dbt, Dagster, and SQLMesh into a single, cohesive tool.

## The Problem

Modern data teams face a fragmented landscape:

- **dbt** is great for SQL transformations, but lacks first-class Python support
- **Dagster** provides excellent orchestration, but requires significant setup
- **Custom scripts** work for Python transformations, but lack proper orchestration

Most teams end up using multiple tools, each with its own learning curve, configuration, and maintenance burden.

## Our Solution

Interlace unifies these concerns with a single `@model` abstraction:

```python
from interlace import model
import ibis

@model(name="active_users", materialize="table")
def active_users(users: ibis.Table) -> ibis.Table:
    return users.filter(users.status == "active")
```

Whether you prefer Python or SQL, the interface is the same. Dependencies are automatic. Orchestration is built-in.

## Key Features

- **Unified Model Abstraction**: One decorator for Python and SQL models
- **Built-in Orchestration**: No external scheduler required, with cron and interval scheduling
- **Multi-Backend Support**: DuckDB for development, PostgreSQL for production, plus additional backends via ibis
- **Change Detection**: Smart change tracking with file hash, upstream, and schema change detection

## Getting Started

Install Interlace and run your first pipeline:

```bash
pip install interlace
interlace init my-pipeline
cd my-pipeline
interlace run
```

Check out our [documentation](/docs) to learn more.

## What's Next

We are just getting started. On our roadmap:

- Streaming ingestion with `@stream` decorator
- Enhanced testing framework
- Full incremental execution with cursor-based processing
- Advanced environment promotion workflows

We would love your feedback. Try Interlace and let us know what you think on [GitHub](https://github.com/interlace-sh/interlace).
