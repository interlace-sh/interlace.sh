---
title: Environments
---

# Environments

An environment is a named set of views over fingerprinted snapshot tables. Sandboxes cost nothing to create, live in the same warehouse as production, and are promoted or dropped atomically.

## Production and Sandboxes

Production (`prod`) is the **unprefixed** namespace — the tables BI tools and consumers connect to. Every other environment prefixes the schema:

| Environment | View for `silver.orders` |
| ----------- | ------------------------ |
| `prod`      | `silver.orders`          |
| `dev`       | `dev__silver.orders`     |
| `pr-142`    | `pr-142__silver.orders`  |

There is no environment list to configure — an environment exists once something has been promoted to it.

## Selecting an Environment

Commands default to `prod`. Target a sandbox with `--env` / `-e`, or set `INTERLACE_ENV`:

```bash
interlace plan --env dev
interlace apply --env dev
interlace checks run --env dev
```

## The Workflow

```bash
# 1. Iterate in a sandbox
interlace apply --env dev
# ... edit models, re-apply, query dev__main.* ...

# 2. See what prod would get
interlace plan

# 3. Promote to production
interlace apply
```

Because snapshots are immutable and views only move after checks pass, a failing apply leaves the environment exactly as it was.

## Inspecting Environments

```bash
interlace env list
```

shows each environment's view namespace, promoted model count, and **drift** — how many compiled models differ from what's promoted there. The same data is available at `GET /environments` and in the web UI.

## Dropping Environments

```bash
interlace env drop dev
```

Drops the environment's views and its prefixed schemas, and deletes its promotion records. The underlying snapshot tables are untouched — they become reclaimable:

```bash
interlace gc              # drop snapshots no environment references (7-day grace)
interlace gc --grace 12h --dry-run
```

Dropping `prod` requires `--force`.

## Environment-Aware Sinks

Models with an `export` block deliver to the outside world (files, external tables). By default they only deliver on a `prod` apply — a sandbox apply builds them but reports them *gated*. Widen with `environments:` on the export block ([details](/docs/guides/sql-models#environment-gating)).

## Notes

- Checks results are recorded per environment; `interlace checks run --env dev` verifies a sandbox without rebuilding
- Each environment promotes independently: the first apply of a fingerprint to an environment builds it there (a snapshot recorded in one environment is reused on later applies to that same environment)
- The daemon serves one environment at a time (`interlace serve --env ...`), but API requests can override per call

## Next Steps

- [Schema evolution](/docs/guides/schema-evolution) — how changes are classified and gated
- [Testing](/docs/guides/testing) — sandboxes as the integration-test layer
