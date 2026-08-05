---
title: Introduction
---

# Introduction to Interlace

Interlace is a Python/SQL-first data platform: transformation, orchestration, and streaming in one tool. You write models as SQL files or Python functions, preview every change with a Terraform-style plan, and promote environments atomically — with data-quality checks gating every promotion.

> **Upgrading from 1.x?** 2.0 changes two things in every model header. `materialise` is now the
> destination plane, so the interlace-owned snapshot is `virtual` (the default) and `table` means
> an _external_ table needing a `target:` — a bare `materialise: table` now fails loudly rather
> than silently changing meaning. The `export:` block is gone; use `materialise: table` or
> `materialise: file`. See [Materialization](/docs/core-concepts/materialization) for the full
> mapping.

## How It Works

Models compile to a dependency graph. Every model gets a **fingerprint** — a hash of its canonical SQL (or Python source), its strategy configuration, and its upstream fingerprints. A build writes an immutable physical table named after that fingerprint; an **environment** is just a set of views pointing at fingerprinted tables. Production is the unprefixed namespace (`main.orders`); sandboxes are prefixed (`dev__main.orders`).

```bash
interlace init my-project && cd my-project
interlace plan            # preview what would change (breaking / additive / clean); nothing runs
interlace apply           # build changed models, run checks, promote
interlace serve           # daemon: web UI (/ui) + HTTP API + scheduler + streams
```

## SQL and Python, One Graph

SQL models are plain `.sql` files with an optional YAML header:

```sql
/* interlace:
  strategy: merge
  key: order_id
  checks:
    - not_null: order_id
*/
SELECT order_id, customer_id, amount
FROM raw_orders
WHERE status = 'complete'
```

Python models are ordinary functions that exchange Apache Arrow data:

```python
from interlace import model
import pyarrow as pa

@model(depends_on=["orders"])
def order_totals(orders) -> pa.Table:
    return orders.table().group_by("customer_id").aggregate([("amount", "sum")])
```

Dependencies are inferred from your SQL automatically (Interlace parses the `FROM`/`JOIN` clauses); Python models declare them with `depends_on`.

## What You Get

- **Plan / apply** — every change is previewed and classified (breaking, additive, or clean) before anything runs; a model whose output is provably identical isn't rebuilt at all. Breaking changes need `--force`.
- **Environments as views** — sandboxes are free; promotion is a view swap, and old snapshots stay around for rollback until `interlace gc`.
- **A real warehouse by default** — DuckLake (Parquet files + a SQL catalog), with DuckDB, Postgres, and served warehouses as additional engines.
- **Streams** — durable HTTP event ingestion with idempotency, schema-drift handling, and micro-batched loading.
- **Checks** — ten built-in data-quality check types plus custom Python checks; failures block promotion.
- **A daemon** — `interlace serve` runs the HTTP API, the scheduler, the stream flusher, and a 10-view web UI in one process.

## Next Steps

- [Install Interlace](/docs/getting-started/installation) to get started
- [Build your first model](/docs/getting-started/first-model) with a hands-on tutorial
- [Explore core concepts](/docs/core-concepts) to understand how Interlace works
