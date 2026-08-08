---
title: Core Concepts
description: 'The ideas behind Interlace: models as the single abstraction, fingerprinted snapshots, environments as views, and dependencies parsed out of SQL.'
---

# Core Concepts

Understanding the fundamental concepts behind Interlace.

## Overview

Interlace is built around a few key ideas:

1. **Models** — transformations written as SQL files or Python functions
2. **Fingerprints & snapshots** — every model version builds an immutable physical table
3. **Plan / apply** — changes are previewed, classified, and gated before they run
4. **Environments** — sets of views over snapshots; production is just the unprefixed one
5. **Strategies** — how a model's table is updated (full refresh, merge, SCD2, time-windowed)
6. **Checks** — data-quality assertions that block promotion when they fail

## Fingerprints and Snapshots

Every model's identity is a 16-character fingerprint: a hash of its canonical SQL (comments stripped, identifiers normalized — for Python models, the function source), its strategy configuration, and the fingerprints of its upstreams. Because upstream fingerprints are included, a change anywhere in the graph automatically re-fingerprints everything downstream.

A build materialises a fingerprint as a physical table:

```
interlace__<schema>.<model>__<fingerprint>     e.g. interlace__main.orders__a1b2c3d4e5f60718
```

These tables are never altered in place. A changed model gets a new fingerprint and a new table; the old one survives (as a rollback target) until `interlace gc` reclaims it. Because fingerprints are comparable, `--select state:modified` targets exactly the models whose fingerprint differs from what the environment promoted — the changed set, and `state:modified+` its descendants too.

## Environments Are Views

An environment maps model names to promoted fingerprints and exposes them as views:

| Environment | View for `silver.orders` |
| ----------- | ------------------------ |
| `prod`      | `silver.orders`          |
| `dev`       | `dev__silver.orders`     |

Production is the **unprefixed** namespace — what BI tools connect to. Every other environment is a prefixed sandbox in the same warehouse. Promotion is a view swap: atomic, instant, and reversible. `interlace env rollback` repoints an environment at an earlier promotion generation — nothing rebuilds, the views just move (each promotion is a numbered generation; `--list` shows the history).

## The Apply Lifecycle

When you run `interlace apply`:

1. **Discover** — `.sql` files are parsed and `.py` files imported from `model_paths` (default `models/`)
2. **Compile** — SQL is parsed to an AST (via sqlglot), dependencies are inferred, fingerprints computed
3. **Diff** — compiled fingerprints are compared with the environment's promoted snapshots; each change is classified `breaking` (rebuild; downstream inherits breaking), `additive` (only new columns appeared — rebuild; downstream stays non-breaking), or `clean` (output provably identical — **not rebuilt**; the snapshot reuses the previous table and the view repoints). **Column pruning** extends `clean` to upstreams: a downstream that provably reads none of the changed columns is clean too
4. **Gate** — a plan containing breaking changes stops unless you pass `--force`
5. **Build** — changed models run in parallel (dependency-levelled, bounded by `parallelism`); data moves as Apache Arrow
6. **Validate** — declared column contracts are enforced against the built table
7. **Check** — data-quality checks run against the fresh snapshot; a failing `error`-severity check blocks everything downstream of this step
8. **Promote** — views are (re)pointed and the environment records the new fingerprints

## Where Things Live

| Piece               | Location (defaults)                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Warehouse (data)    | DuckLake at `.interlace/warehouse.ducklake` + Parquet                                                 |
| Control plane state | SQLite at `.interlace/state.db` (snapshots, environments, run queue, events, check results, API keys) |
| Stream log          | SQLite at `.interlace/streams.db` (durable event log)                                                 |

## Learn More

- [Models](/docs/core-concepts/models) — SQL headers, the `@model` decorator, contracts
- [Dependencies](/docs/core-concepts/dependencies) — inference, explicit deps, selectors
- [Materialization](/docs/core-concepts/materialization) — virtual, view, ephemeral, and terminal table/file
- [Strategies](/docs/core-concepts/strategies) — full, merge, SCD2, incremental by time
