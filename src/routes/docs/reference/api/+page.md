---
title: API Reference
description: 'Every HTTP route served by interlace serve, with auth scopes and status codes. Interactive OpenAPI docs are served by a running daemon at /schema/scalar.'
---

# API Reference

Every HTTP route served by `interlace serve`. Interactive OpenAPI docs are always available on a running daemon at `/schema/scalar` (spec at `/schema/openapi.json`).

## Conventions

- **Auth**: `Authorization: Bearer ilk_...`. While no API key exists the whole API is open (keyless mode); the first key locks it down. Each route requires one scope — `read`, `write`, or `admin`; a key carries any combination, and an `admin` key satisfies every requirement. Missing/invalid token → 401; insufficient scope → 403.
- **Status codes**: GETs and DELETEs return 200; POSTs return 201, except `POST /runs/{id}/cancel` and `POST /environments/{name}/rollback`, which return 200; errors are 400 (bad request/blocked), 401 (missing/invalid token), 403 (wrong scope), 404 (unknown), 429 (backpressure). A failed engine statement adds `statement` (the SQL that failed) next to `detail`. The same SQL is on the `model.failed` event.
- `/health`, `/schema/*`, and `/ui/*` never require auth.

## Meta

| Route         | Scope | Description                      |
| ------------- | ----- | -------------------------------- |
| `GET /health` | open  | `{status, version, environment}` |
| `GET /`       | open  | Redirects to `/ui/`              |
| `GET /ui/...` | open  | The web UI                       |

## Models & Lineage

| Route                        | Scope | Description                                                                                                                                                                      |
| ---------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /models`                | read  | All models in topological order: name, materialise/output, strategy, fingerprint, `depends_on`, tags, schedule                                                                   |
| `GET /models/{name}`         | read  | Adds upstream/downstream, column lineage, SQL or Python source, `indexes`, `constraints`, and `schema`                                                                           |
| `GET /models/{name}/impact`  | read  | Column blast radius for `?column=COL`: `{source, impacted[{model, column, via}], opaque_consumers[]}` — mirrors `interlace impact`                                               |
| `GET /models/{name}/preview` | read  | Row sample and column profile (`nulls`, `distinct`, `min`, `max`) plus the last build. `?limit=` defaults to 25, capped at 100. Ephemeral and file outputs set `available` false |
| `GET /lineage`               | read  | The whole graph in one payload: models, edges, column-level lineage, streams and their consumers — what the UI's lineage canvas renders                                          |

## Plan & Apply

| Route         | Scope | Description                                                                                                                                                                                                                                   |
| ------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /plan`   | read  | `environment`, `select`, `forward_only`. Returns `changes[]`, `transfers[]`, `physical[]` (`+ index` / `- constraint`, no rebuild), and `drift[]`                                                                                             |
| `POST /apply` | write | Body `{selectors, environment, force, forward_only}`. Breaking plan without `force` → 409. Blocking schema drift → 400 before any write (`force` does not bypass it). Returns `{built, promoted, breaking, reused, transfers, rows, timings}` |

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

| Route                                    | Scope | Description                                                                                                                                                |
| ---------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /checks`                            | read  | Recorded check results (filter with `?model=`)                                                                                                             |
| `GET /models/{name}/checks/{check}/rows` | read  | The rows that check rejected, from the snapshot it ran against — including when promotion was blocked. Table-level and Python checks set `available` false |
| `POST /checks/run`                       | write | Body `{environment, selectors}` (optional). Runs checks against promoted tables, no rebuild. Returns `{outcomes, skipped, passed, blocking_failures}`      |

## Streams

| Route                         | Scope | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /streams`                | read  | Per stream: `schema`, `table`, `head` (accepted), `watermark` (materialised), `pending` (head − watermark), `on_schema_drift`, `retention`                                                                                                                                                                                                                                                                                                                                                              |
| `GET /streams/{name}`         | read  | Adds `idempotency_key` and `recent` (the last 20 payloads)                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `POST /streams/{name}`        | write | Body: one JSON object or an array. Durable before it returns. `{accepted, deduplicated, last_offset, quarantined}`. Schema violations → 400 (reject/evolve) or quarantined (quarantine mode); warehouse too far behind → 429                                                                                                                                                                                                                                                                            |
| `GET /streams/{name}/events`  | read  | SSE tail of the durable log for an external consumer. Data frames are `{offset, ts, payload, idempotency_key, headers}` with `id` = offset. No cursor starts at the head (live only); `after=0` replays; `Last-Event-ID` resumes. `group` takes that consumer group's lease (409 if held) and resumes from its committed offset; the first frame is `event: lease` with `{group, token, committed_offset}`. A frame is not an ack. `?token=` is accepted here. `<name>__quarantine` tails diverted rows |
| `POST /streams/{name}/commit` | write | Body `{group, offset, token}` from the lease frame. Advances that group's committed offset. A stale token → 400                                                                                                                                                                                                                                                                                                                                                                                         |

## Query Console

| Route         | Scope | Description                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /query` | read  | Body `{sql, limit: 500}` (capped at 10,000). Exactly one `SELECT`/`UNION` statement — DDL/DML and external readers (`read_csv`, `query`, `glob`, HTTP/file) are rejected at parse. Runs on a **sandboxed cursor with external access disabled** (warehouse only), 30s timeout, ~8 MB cell cap. Returns `{columns, types, rows, row_count, truncated, elapsed_ms}` |

## System

| Route            | Scope | Description                                                                                                                                                                                                                                                                                                                |
| ---------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /engines`   | read  | Configured engines (DSN credentials redacted)                                                                                                                                                                                                                                                                              |
| `GET /schedules` | read  | Scheduled models: kind (`cron`/`every`), expression, `next_fire`, `last_fired`                                                                                                                                                                                                                                             |
| `POST /gc`       | admin | Body `{grace: "7d", dry_run: false}` (optional). Returns `{removed_snapshots, dropped_tables, kept_snapshots, dry_run}`                                                                                                                                                                                                    |
| `POST /reset`    | admin | Body `{confirm: false, dry_run: false}`. Requires `confirm: true` unless `dry_run`. Wipes Interlace-owned views, snapshots, runs, events, and streams; does **not** drop table/file destinations. Returns `{dropped_views, dropped_schemas, cleared_snapshots, kept_terminals, environments, stream_log_cleared, dry_run}` |

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

Event types: `run.enqueued`, `run.started`, `run.succeeded`, `run.retrying`, `run.failed`, `run.cancel_requested`, `run.cancelled`, `apply.started`, `apply.finished`, `apply.blocked`, `model.start`, `model.done`, `model.failed`, `model.cancelled`, `stream.flushed`, `environment.dropped`, `environment.rolled_back`, `gc.finished`, `reset.finished`.

Note: browser `EventSource` can't send an `Authorization` header — once keys exist, browser clients should poll `GET /events`; non-browser SSE clients pass the bearer header as usual.
