---
title: Environments
---

# Environments

An environment is a named mapping from each model to the fingerprint currently promoted there, materialised as **views over immutable snapshot tables** (`interlace__<schema>.<model>__<fp>`). Promotion is an atomic view swap over those shared tables — cheap, and two environments that promote the same fingerprint share one physical table. Sandboxes cost nothing to create and live in the same warehouse as production.

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

## Promotion

`apply` builds the changed snapshots, runs their checks, and — only if checks pass — repoints the environment's views at the new tables and records the new fingerprint mapping. A model whose output is provably unchanged is **reused**: its view repoints to the existing table, nothing is rebuilt. Deleting a model drops its view. `apply` refuses to proceed when the plan contains **breaking** changes unless given `--force`. Because views only move after checks pass, a failing apply leaves the environment exactly as it was.

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

## Inspecting Environments

```bash
interlace env list
```

shows each environment's promoted-model count and **drift** — how many compiled models have a fingerprint different from the one promoted there. The same data is available at `GET /environments` and in the web UI.

Scope a plan or apply to exactly the drifted models with the `state:modified` selector — models whose fingerprint differs from the target environment, plus everything downstream. This is the CI diff:

```bash
interlace plan  --env dev --select state:modified
interlace apply --env dev --select state:modified
```

## Rollback

Every promote records the environment's **full** model→fingerprint mapping as a numbered _generation_ in the state store (only when the mapping actually changed, so a busy scheduler re-promoting identical fingerprints doesn't bury the real history). Rollback repoints the environment's views at an earlier generation — **nothing rebuilds**, the views just move:

```bash
interlace env rollback              # to the generation before the latest
interlace env rollback --to 3       # to a specific generation
interlace env rollback --list       # show the promotion history (state only)
```

The equivalent API is `POST /environments/{name}/rollback` with `{"generation": N}` (admin scope), and `GET /environments/{name}/history` lists the generations. Rollback itself records a new generation, so it is reversible — apply again to return to the latest state. It requires the target generation's snapshots to still exist; a target already reclaimed by `gc` is refused per-model with a clear message (rebuild from an older definition instead).

## Dropping Environments

```bash
interlace env drop dev
```

Removes the environment's views and releases its snapshots to `gc`. The underlying snapshot tables are then reclaimable — but `gc` is **reference-aware**, so a table shared through reuse survives as long as any other environment still points at it:

```bash
interlace gc              # drop snapshots no environment references (7-day grace)
interlace gc --grace 12h --dry-run
```

A real `gc` run also trims the event log, check results, and finished runs older than 30 days, caps promotion history at the newest 50 generations per environment, and sweeps expired stream events per their retention. Dropping `prod` requires `--force`.

## Environment-Aware Sinks

Models with an `export` block deliver to the outside world (files, external tables). By default they only deliver on a `prod` apply — a sandbox apply builds them but reports them _gated_. Widen with `environments:` on the export block ([details](/docs/guides/sql-models#environment-gating)).

## Notes

- Checks results are recorded per environment; `interlace checks run --env dev` verifies a sandbox without rebuilding
- Snapshot tables are immutable and shared: a fingerprint already built for one environment is reused (never rebuilt) when another environment promotes it
- The daemon serves one environment by default (`interlace serve --env ...`), but every plan/apply/run/checks request accepts its own `environment`

## Next Steps

- [Schema evolution](/docs/guides/schema-evolution) — how changes are classified and gated
- [Testing](/docs/guides/testing) — sandboxes as the integration-test layer
