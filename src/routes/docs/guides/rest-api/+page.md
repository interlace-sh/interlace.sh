---
title: REST API & Service
---

# REST API & Service

`interlace serve` runs the Interlace daemon: HTTP API, background scheduler, stream flusher, and an embedded web UI — one process. It requires the `service` extra (`pip install 'interlaced[service]'`).

## Starting the Service

```bash
interlace serve                          # 127.0.0.1:8000, scheduler on
interlace serve --host 0.0.0.0 --port 9000
interlace serve --env dev                # serve a sandbox environment
interlace serve --no-scheduler           # API only; run `interlace scheduler` separately
interlace serve --quack quack:localhost:4213   # also share the warehouse
```

If the port is busy, the next free one is used. On boot it prints `UI at http://127.0.0.1:8000/ui`; interactive OpenAPI docs live at `/schema/scalar`.

## Authentication

The API starts in **keyless mode**: while no API key exists, everything is open for local development. Creating the first key locks the API down immediately:

```bash
interlace apikey create ci --scope read
# ilk_2f4a...  (shown once — store it now)
```

Tokens are `ilk_`-prefixed and sent as a bearer header:

```bash
curl -H "Authorization: Bearer ilk_..." localhost:8000/models
```

Three scopes: **read** (all GETs and the query console), **write** (trigger runs and applies, publish events, run checks), **admin** (key management, environment drops, GC — and it satisfies every other requirement). A key carries any combination (`--scope` is repeatable); manage keys with `interlace apikey create|revoke|list` or the `/apikeys` endpoints. `/health`, `/schema/*`, and the `/ui` shell stay open — the UI's API calls still enforce scopes.

## The API at a Glance

| Area         | Endpoints                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Models       | `GET /models`, `GET /models/{name}`, `GET /models/{name}/impact` (column blast radius)                                       |
| Plan & apply | `GET /plan`, `POST /apply`                                                                                                   |
| Runs         | `GET /runs`, `GET /runs/{id}`, `POST /runs`, `POST /runs/{id}/cancel`                                                        |
| Environments | `GET /environments`, `DELETE /environments/{name}`, `GET /environments/{name}/history`, `POST /environments/{name}/rollback` |
| Checks       | `GET /checks`, `POST /checks/run`                                                                                            |
| Streams      | `GET /streams`, `GET /streams/{name}`, `POST /streams/{name}`                                                                |
| Query        | `POST /query` (SELECT-only console)                                                                                          |
| Lineage      | `GET /lineage` (whole graph, column-level)                                                                                   |
| System       | `GET /engines`, `GET /schedules`, `GET /health`, `POST /gc`                                                                  |
| Keys         | `GET /apikeys`, `POST /apikeys`, `DELETE /apikeys/{name}`                                                                    |
| Events       | `GET /events`, `GET /events/stream` (SSE)                                                                                    |

Full request/response shapes are in the [API reference](/docs/reference/api).

### Triggering work

```bash
# enqueue a run on the durable queue (executed with leases + retries)
curl -X POST localhost:8000/runs -H 'content-type: application/json' \
  -d '{"selectors": ["orders+"]}'

# plan/apply, mirroring the CLI (breaking changes 400 without force)
curl -X POST localhost:8000/apply -H 'content-type: application/json' \
  -d '{"environment": "dev", "forward_only": false, "force": false}'
```

### The query console

`POST /query` runs **exactly one SELECT** (a single `Select`/`Union` at the top level; DDL/DML is rejected before execution), capped at 10,000 rows. The SQL is parsed and fenced _before_ it runs: every table source must be a real table or view — table functions and file/HTTP readers like `read_csv`, `query`, and `glob` are refused (named or not), so the console can only read the warehouse. The same fence backs `interlace query` on the CLI:

```bash
curl -X POST localhost:8000/query -H 'content-type: application/json' \
  -d '{"sql": "SELECT * FROM main.event_totals", "limit": 100}'
```

Returns `columns`, `types`, `rows`, `row_count`, `truncated`, and `elapsed_ms` (30s timeout).

## Live Events

Everything the platform does lands on a durable event log: `run.*` (enqueued/started/succeeded/retrying/failed/cancelled), `apply.*` (started/finished/blocked), per-model build progress (`model.start`/`model.done`/`model.failed`), `stream.flushed`, `environment.dropped`, `environment.rolled_back`, `gc.finished`.

- `GET /events/stream` — Server-Sent Events; reconnecting clients resume from `Last-Event-ID` with no gaps. `EventSource` can't send an `Authorization` header, so once the API is keyed, clients poll `GET /events` instead
- `GET /events?after=<seq>` — polling, 200 events per page

## The Web UI

`/ui` serves a zero-build-step web app with ten views:

| View         | What it shows                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Overview     | Environment, drift, recent runs, streams, checks at a glance                                                                 |
| Lineage      | Whole-graph canvas — trace a model's blast radius or a **single column** across the pipeline; edges animate while builds run |
| Models       | Every model with detail, SQL/source, and one-click runs                                                                      |
| Plan         | The live plan with SQL diffs; apply from the browser                                                                         |
| Runs         | The queue — rows expand in place with CLI-style build results; cancel runs                                                   |
| Query        | The SELECT console with a table browser                                                                                      |
| Streams      | Heads, watermarks, recent payloads; publish test events                                                                      |
| Checks       | Check history; run checks on demand                                                                                          |
| Environments | Promote state and drift per environment; apply or drop                                                                       |
| System       | Engines, schedules, API keys, GC                                                                                             |

A build dock narrates the currently running build on every view, fed by the live event stream.

## Next Steps

- [API reference](/docs/reference/api) — every route in detail
- [Streaming](/docs/guides/streaming) — the ingestion endpoints
- [CLI reference](/docs/reference/cli) — `serve`, `scheduler`, and `apikey`
