---
title: API Reference
description: 'Every HTTP route served by interlace serve, with auth scopes and status codes. Interactive OpenAPI docs are served by a running daemon at /schema/scalar.'
---

# API Reference

Every HTTP route served by `interlace serve`. Interactive OpenAPI docs are always available on a running daemon at `/schema/scalar` (spec at `/schema/openapi.json`).

## Conventions

- **Auth**: `Authorization: Bearer ilk_...`. While no API key exists the whole API is open (keyless mode); the first key locks it down. Each route requires one scope — `read`, `write`, or `admin`; a key carries any combination, and an `admin` key satisfies every requirement. Missing/invalid token → 401; insufficient scope → 403.
- **Status codes**: GETs and DELETEs return 200; POSTs return 201, except `POST /runs/{id}/cancel` and `POST /environments/{name}/rollback`, which return 200; errors are 400 (bad request/blocked), 401 (missing/invalid token), 403 (wrong scope), 404 (unknown), 429 (backpressure).
- `/health`, `/schema/*`, and `/ui/*` never require auth.

## Meta

| Route         | Scope | Description                      |
| ------------- | ----- | -------------------------------- |
| `GET /health` | open  | `{status, version, environment}` |
| `GET /`       | open  | Redirects to `/ui/`              |
| `GET /ui/...` | open  | The web UI                       |

## Models & Lineage

| Route                       | Scope | Description                                                                                                                                      |
| --------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /models`               | read  | All models in topological order: name, materialise/output, strategy, fingerprint, `depends_on`, tags, schedule                                   |
| `GET /models/{name}`        | read  | Adds full upstream/downstream closures, column lineage, canonical SQL (or Python source)                                                         |
| `GET /models/{name}/impact` | read  | Column blast radius for `?column=COL`: `{source, impacted[{model, column, via}], opaque_consumers[]}` — mirrors `interlace impact`. New in 1.0.2 |
| `GET /lineage`              | read  | The whole graph in one payload: models, edges, column-level lineage, streams and their consumers — what the UI's lineage canvas renders          |

## Plan & Apply

| Route         | Scope | Description                                                                                                                                                                                  |
| ------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /plan`   | read  | Query params `environment`, `select` (selector string), `forward_only`. Returns `changes[]` (with change_type, category, fingerprints, impacted columns, previous/new SQL) and `transfers[]` |
| `POST /apply` | write | Body `{selectors: [], environment, force: false, forward_only: false}`. Breaking plan without `force` → 400. Returns `{built, promoted, breaking, reused, transfers, rows, timings}`         |

## Runs

| Route                    | Scope | Description                                                                                                                                                                     |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /runs`              | read  | Durable queue, newest first: state, attempts, error, partition window, idempotency key (its prefix names the trigger: `cron:`, `interval:`, `api:`, `stream:`)                  |
| `GET /runs/{id}`         | read  | Run detail plus its merged event history                                                                                                                                        |
| `POST /runs`             | write | Body `{selectors: [], environment, start, end, restate: false}` (empty selectors = all models; ISO timestamps). Returns `{enqueued, models}` — `enqueued: 0` means deduplicated |
| `POST /runs/{id}/cancel` | write | 200. Queued cancels now; running cancels at the worker's next heartbeat. Unknown/finished → 404                                                                                 |

Runs are executed by the scheduler loop with 60-second leases, up to 3 attempts, and cooperative cancellation.

## Environments

| Route                                | Scope | Description                                                                                                                                           |
| ------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /environments`                  | read  | Per environment: promoted model count, drift vs the compiled project, `promoted_at`                                                                   |
| `DELETE /environments/{name}`        | admin | 200. Drops views (`{environment, dropped_views}`); `prod` requires `?force=true`; unknown → 404. Emits `environment.dropped`                          |
| `GET /environments/{name}/history`   | read  | Promotion generations, newest first — the rollback targets: `[{generation, promoted_at, models}]`                                                     |
| `POST /environments/{name}/rollback` | admin | 200. Body `{generation?}` (default: the one before latest). Repoints views at that generation — **nothing rebuilds**. Emits `environment.rolled_back` |

## Checks

| Route              | Scope | Description                                                                                                                                           |
| ------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /checks`      | read  | Recorded check results (filter with `?model=`)                                                                                                        |
| `POST /checks/run` | write | Body `{environment, selectors}` (optional). Runs checks against promoted tables, no rebuild. Returns `{outcomes, skipped, passed, blocking_failures}` |

## Streams

| Route                  | Scope | Description                                                                                                                                                                                                                  |
| ---------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /streams`         | read  | Per stream: `schema`, `table`, `head` (accepted), `watermark` (materialised), `pending` (head − watermark), `on_schema_drift`, `retention`                                                                                   |
| `GET /streams/{name}`  | read  | Adds `idempotency_key` and `recent` (the last 20 payloads)                                                                                                                                                                   |
| `POST /streams/{name}` | write | Body: one JSON object or an array. Durable before it returns. `{accepted, deduplicated, last_offset, quarantined}`. Schema violations → 400 (reject/evolve) or quarantined (quarantine mode); warehouse too far behind → 429 |

## Query Console

| Route         | Scope | Description                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /query` | read  | Body `{sql, limit: 500}` (capped at 10,000). Exactly one `SELECT`/`UNION` statement — DDL/DML and external readers (`read_csv`, `query`, `glob`, HTTP/file) are rejected at parse. Runs on a **sandboxed cursor with external access disabled** (warehouse only), 30s timeout, ~8 MB cell cap. Returns `{columns, types, rows, row_count, truncated, elapsed_ms}` |

## System

| Route            | Scope | Description                                                                                                             |
| ---------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET /engines`   | read  | Configured engines (DSN credentials redacted)                                                                           |
| `GET /schedules` | read  | Scheduled models: kind (`cron`/`every`), expression, `next_fire`, `last_fired`                                          |
| `POST /gc`       | admin | Body `{grace: "7d", dry_run: false}` (optional). Returns `{removed_snapshots, dropped_tables, kept_snapshots, dry_run}` |

## API Keys

| Route                    | Scope | Description                                                        |
| ------------------------ | ----- | ------------------------------------------------------------------ |
| `GET /apikeys`           | admin | Names, scopes, creation times — never the secrets                  |
| `POST /apikeys`          | admin | Body `{name, scopes: ["read"]}`. Returns the `ilk_` token **once** |
| `DELETE /apikeys/{name}` | admin | 200. Revokes every key with that name                              |

Bootstrap: while keyless, `POST /apikeys` works unauthenticated — create the first (admin) key, then everything requires tokens.

## Events

| Route                | Scope | Description                                                                                                                                                |
| -------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /events`        | read  | Durable event log; `?after=<seq>` pages forward, 200 per call                                                                                              |
| `GET /events/stream` | read  | Server-Sent Events. Each message: `event` = type, `id` = sequence, `data` = the full event. Reconnects resume from the `Last-Event-ID` header with no gaps |

Event types: `run.enqueued`, `run.started`, `run.succeeded`, `run.retrying`, `run.failed`, `run.cancel_requested`, `run.cancelled`, `apply.started`, `apply.finished`, `apply.blocked`, `model.start`, `model.done`, `model.failed`, `model.cancelled`, `stream.flushed`, `environment.dropped`, `environment.rolled_back`, `gc.finished`.

Note: browser `EventSource` can't send an `Authorization` header — once keys exist, browser clients should poll `GET /events`; non-browser SSE clients pass the bearer header as usual.
