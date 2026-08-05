---
title: 'Virtual Environments: Sandboxes That Cost Nothing'
date: '2026-07-31'
author: Interlace Team
excerpt: An environment is not a copy of your data, it is a set of views over it. How fingerprinted tables make dev sandboxes free, promotion an atomic view swap, and rollback instant.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Virtual Environments: Sandboxes That Cost Nothing" date="2026-07-31" />

If you work with external APIs, you know the pain: there is no `dev.github.com`, no `staging.api.companieshouse.gov.uk`, no `test.api.os.uk`. Production is the only endpoint. So how do you get a development environment without re-fetching everything you already have?

The traditional answer is to copy. Duplicate the warehouse, or maintain a separate dev database and periodically sync it. Both are slow, both drift, and both cost storage proportional to the number of people on your team.

Interlace takes a different approach: **an environment is not a copy of your data, it is a set of views over it.** Spinning up a sandbox costs nothing, and it reuses production's tables for free.

## Fingerprinted Tables, Named Views

Every model builds into a physical table whose name includes a fingerprint of the logic that produced it:

```
interlace__main.orders__a1b2c3
```

That table is immutable. If the model's definition changes, the new version gets a new fingerprint and a new table — the old one stays exactly where it is.

An **environment** is then just a set of views pointing at those tables. Production is the **unprefixed** namespace; every other environment prefixes its schema:

| Environment | View for `main.orders` |
| ----------- | ---------------------- |
| `prod`      | `main.orders`          |
| `dev`       | `dev__main.orders`     |
| `pr-142`    | `pr-142__main.orders`  |

Your BI tools and downstream consumers connect to `main.orders` and never need to know a fingerprint exists.

## Why Sandboxes Are Free

Here is the part that removes the re-fetching problem. When you apply to a sandbox, Interlace does not rebuild models whose fingerprint already exists — it points the sandbox's views at the tables production already built.

```bash
interlace apply --env dev
```

If you have changed one model out of forty, the dev environment builds that one model and reuses the other thirty-nine. There is no copy step, no sync job, and no second warehouse. The expensive source extract that production ran this morning is the same table your sandbox reads this afternoon.

There is also no environment list to configure. An environment exists once something has been promoted to it.

## Promotion Is a View Swap

Because the tables are immutable and the environment is only a pointer, promoting to production is an atomic view swap rather than a data migration:

```bash
# 1. Iterate in a sandbox
interlace apply --env dev

# 2. See what prod would get
interlace plan

# 3. Promote
interlace apply
```

Two properties fall out of this design. **Rollback is the same operation as promotion** — the previous fingerprint's table has not gone anywhere, so pointing the view back is instant. And because views only move after data-quality checks pass, a failing apply leaves the environment exactly as it was. There is no half-promoted state to clean up.

`interlace plan` classifies every change as breaking, non-breaking, or forward-only before anything runs, and refuses to apply breaking changes without `--force`.

## Inspecting and Reclaiming

```bash
interlace env list
```

shows each environment's view namespace, how many models are promoted to it, and its **drift** — how many compiled models differ from what is currently promoted there. The same data is available at `GET /environments` and in the web UI.

Dropping a sandbox removes its views and prefixed schemas, but deliberately leaves the underlying tables alone:

```bash
interlace env drop dev
```

Those snapshots simply become reclaimable. Garbage collection is reference-aware, so a table that production is still using — or that another environment reuses — survives:

```bash
interlace gc                        # 7-day grace period by default
interlace gc --grace 12h --dry-run
```

## Sandboxes Cannot Touch Production Systems

Models with an `export` block deliver results to the outside world: an external Postgres table, a Parquet file, an operational system. These sinks are **environment-gated**. By default they fire only on a `prod` apply — a sandbox apply builds the model and reports the sink as _gated_ rather than writing to a live external table.

This is the safety property that matters most in practice. You can run `interlace apply --env dev` against real production source tables without any risk that a half-finished model writes into your CRM. Widen the gate explicitly when you want it:

```yaml
export:
  to: table
  target: crm.public.accounts
  mode: merge
  key: id
  environments: [dev, prod]
```

## What's Next

- **Deeper UI tracing** — environment switcher and drift visualisation in the web UI at `/ui`
- **Broader engine support** beyond DuckDB/DuckLake and Postgres-over-ADBC
- **Postgres control plane** as the scale-out swap for SQLite WAL

Environments ship in Interlace 1.0. To get started, read the [Environments guide](/docs/guides/environments) and [Schema evolution](/docs/guides/schema-evolution), or try it yourself:

```bash
uv pip install "interlaced[service]"
```
