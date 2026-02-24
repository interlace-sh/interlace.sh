---
title: REST API & Service
---

# REST API & Service

Interlace includes a built-in HTTP service that exposes a REST API for triggering runs, querying models, streaming real-time events, and serving an embedded web UI. The service is powered by aiohttp and runs as a long-lived process with an optional background scheduler.

## Starting the Service

```bash
interlace serve                          # Start on localhost:8080
interlace serve --host 0.0.0.0 --port 9090
interlace serve --run                    # Run all models on startup
interlace serve --no-scheduler           # Disable background scheduler
interlace serve --no-ui                  # API only, no web UI
```

All flags:

| Flag | Default | Description |
|------|---------|-------------|
| `--host` | `127.0.0.1` | Host to bind to |
| `--port` | `8080` | Port to bind to |
| `--env` | None | Environment (dev, staging, prod) |
| `--run` | `false` | Run all models on startup |
| `--no-scheduler` | `false` | Disable the background scheduler |
| `--no-ui` | `false` | Disable the embedded web UI |
| `--project-dir`, `-d` | Current directory | Project directory |
| `--verbose`, `-v` | `false` | Verbose logging |

## API Documentation

Interactive Swagger UI is available at `/api/docs` when the service is running. The OpenAPI 3.0 specification is served at `/api/openapi.yaml`.

## Key Endpoints

All endpoints are under the `/api/v1` prefix.

### Health & Info

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check with connection status and uptime |
| GET | `/api/v1/project` | Project metadata (name, model count, connections) |
| GET | `/api/v1/info` | API version and feature flags |
| GET | `/api/v1/scheduler` | Scheduler status with per-model next fire times |

### Models

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/models` | List all models (filterable by schema, type, tags) |
| GET | `/api/v1/models/{name}` | Model details (config, dependencies, fields) |
| GET | `/api/v1/models/{name}/lineage` | Upstream and downstream lineage graph |
| GET | `/api/v1/models/{name}/runs` | Execution history for a model |
| GET | `/api/v1/models/{name}/columns` | Column list |
| GET | `/api/v1/models/{name}/columns/{col}/lineage` | Column-level lineage |
| GET | `/api/v1/models/{name}/schema/history` | Schema change history |
| GET | `/api/v1/models/{name}/schema/current` | Current schema version |
| GET | `/api/v1/models/{name}/schema/diff` | Compare schema versions |

### Execution

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/runs` | Trigger execution (returns 202 Accepted) |
| GET | `/api/v1/runs/{run_id}/status` | Run status with per-task progress |
| POST | `/api/v1/runs/{run_id}/cancel` | Cancel a running execution |
| GET | `/api/v1/flows` | Execution history with pagination and filtering |
| GET | `/api/v1/flows/{flow_id}` | Flow details including all tasks |
| GET | `/api/v1/flows/{flow_id}/tasks` | Tasks in a flow |

### Analysis

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/graph` | Full dependency graph |
| GET | `/api/v1/graph/validate` | Validate graph for cycles and issues |
| GET | `/api/v1/plan` | Impact analysis (what would run) |
| POST | `/api/v1/plan` | Impact analysis with custom parameters |
| GET | `/api/v1/lineage` | Full lineage graph |
| POST | `/api/v1/lineage/refresh` | Refresh cached lineage data |

### Events

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/events` | Server-Sent Events stream for real-time updates |

### Streams

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/streams` | List all streams |
| GET | `/api/v1/streams/{name}` | Stream details (fields, endpoints, row count) |
| POST | `/api/v1/streams/{name}` | Publish events to a stream |
| GET | `/api/v1/streams/{name}/subscribe` | Subscribe to stream events via SSE |
| POST | `/api/v1/streams/{name}/consume` | Consume a batch of unprocessed events |
| POST | `/api/v1/streams/{name}/ack` | Acknowledge processed events |

## Triggering Runs via API

```bash
# Run all models
curl -X POST http://localhost:8080/api/v1/runs \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

# Run specific models with backfill
curl -X POST http://localhost:8080/api/v1/runs \
  -H "Content-Type: application/json" \
  -d '{
    "models": ["users", "orders"],
    "since": "2024-01-01",
    "until": "2024-06-30"
  }'
```

The `POST /runs` endpoint accepts:

| Field | Type | Description |
|-------|------|-------------|
| `models` | `string[] \| null` | Models to run (`null` or omitted = all) |
| `force` | `boolean` | Force re-execution even if no changes detected |
| `since` | `string` | Override cursor start for backfill (implies `force: true`) |
| `until` | `string` | Upper bound for backfill cursor filter |
| `trigger_metadata` | `object` | Arbitrary metadata attached to the flow |

The response is `202 Accepted` with a `run_id` you can poll for status:

```bash
# Check run status
curl http://localhost:8080/api/v1/runs/run_abc123def456/status
```

The status response includes per-task progress:

```json
{
  "run_id": "run_abc123def456",
  "status": "running",
  "elapsed_seconds": 12.5,
  "progress": {
    "total_tasks": 8,
    "completed": 5,
    "failed": 0,
    "running": 2,
    "pending": 1
  }
}
```

## Querying Execution History

List recent flows with optional filters:

```bash
# All flows
curl http://localhost:8080/api/v1/flows

# Filter by status and date range
curl "http://localhost:8080/api/v1/flows?status=failed&since=2024-01-01&limit=10"

# Get tasks for a specific flow
curl http://localhost:8080/api/v1/flows/{flow_id}/tasks
```

Query parameters for `GET /flows`:

| Param | Description |
|-------|-------------|
| `status` | Filter by status (pending, running, completed, failed, cancelled) |
| `trigger_type` | Filter by trigger (cli, api, schedule, event, webhook) |
| `since` | Flows started after this timestamp |
| `until` | Flows started before this timestamp |
| `limit` | Max results (default: 50, max: 1000) |
| `offset` | Pagination offset |

## Authentication

API key authentication is configured in `config.yaml`:

```yaml
service:
  auth:
    enabled: true
    api_keys:
      - name: "production"
        key: "${INTERLACE_API_KEY}"
        permissions: [read, write, execute]
      - name: "monitoring"
        key: "${MONITORING_KEY}"
        permissions: [read]
    whitelist:
      - /health
      - /api/v1/health
      - /api/docs
      - /api/openapi.yaml
```

### Authentication Methods

Include the API key in requests via either:

- `Authorization: Bearer <key>` header
- `X-API-Key: <key>` header

```bash
# Using Bearer token
curl -H "Authorization: Bearer $INTERLACE_API_KEY" \
  http://localhost:8080/api/v1/models

# Using X-API-Key header
curl -H "X-API-Key: $INTERLACE_API_KEY" \
  http://localhost:8080/api/v1/models
```

### Permission Model

| Permission | Grants Access To |
|-----------|-----------------|
| `read` | GET requests (models, flows, health, etc.) |
| `write` | POST/PUT requests (excluding runs and lineage refresh) |
| `execute` | POST /runs, POST /lineage/refresh |

Whitelisted paths bypass authentication entirely. Use wildcards for prefix matching (e.g. `/api/docs*`). Non-API paths (static files, web UI) are never subject to authentication.

## Rate Limiting

Per-key rate limiting with a token bucket algorithm:

```yaml
service:
  auth:
    rate_limit:
      requests_per_second: 100
      burst: 200
```

Returns `429 Too Many Requests` with a `retry_after` value when the limit is exceeded.

## Real-Time Events (SSE)

Subscribe to execution events via Server-Sent Events:

```bash
# Subscribe to all events
curl -N http://localhost:8080/api/v1/events

# Subscribe to events for a specific flow
curl -N "http://localhost:8080/api/v1/events?flow_id=run_abc123"

# Subscribe to specific event types
curl -N "http://localhost:8080/api/v1/events?types=flow.completed,flow.failed"
```

Event types include:

- **Flow events:** `flow.started`, `flow.completed`, `flow.failed`, `flow.cancelled`
- **Task events:** `task.enqueued`, `task.waiting`, `task.ready`, `task.running`, `task.materialising`, `task.completed`, `task.failed`, `task.skipped`, `task.progress`

Events are formatted as standard SSE with JSON data. A keepalive comment is sent every 30 seconds to prevent connection timeouts. Useful for building dashboards, CI integrations, or triggering downstream workflows.

## Web UI

The service includes an embedded web UI (Svelte 5) accessible at the root URL. It provides:

- Model browser with dependency graph visualisation
- Execution history and run details
- Real-time monitoring via SSE
- Schema explorer and column lineage views
- Backfill mode with date range inputs

Disable with `--no-ui` if running API-only.

## CORS

The service automatically configures CORS for the Vite dev server (`localhost:5173`) and same-origin requests. Pass custom origins via the programmatic API:

```python
from interlace.service.server import run_service

run_service(
    project_dir=".",
    env="prod",
    host="0.0.0.0",
    port=8080,
    cors_origins=["https://dashboard.example.com"],
)
```

## Full Interactive Reference

For the complete request/response schemas, try the interactive Swagger UI at `/api/docs` when the service is running. It documents every endpoint, query parameter, and response body.
