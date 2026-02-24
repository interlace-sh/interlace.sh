---
title: Streaming
---

# Streaming

Streams are durable, append-only tables that serve as the ingestion layer for event data. They provide HTTP webhook endpoints, a programmatic publish/subscribe API, and cursor-based batch consumption -- all backed by your database.

## Defining a Stream

Use the `@stream` decorator to declare a stream. The decorated function itself is never executed -- it serves as a registration point for stream metadata.

```python
from interlace import stream

@stream(
    name="user_events",
    schema="events",
    connection="default",
    cursor="rowid",
    fields={"user_id": "string", "action": "string", "timestamp": "timestamp"},
    description="User interaction events",
    tags=["ingestion", "clickstream"],
    owner="data-team",
)
def user_events():
    pass
```

### Decorator Parameters

| Parameter         | Type              | Default    | Description                                              |
| ----------------- | ----------------- | ---------- | -------------------------------------------------------- |
| `name`            | `str \| None`     | func name  | Stream name (defaults to the function name)              |
| `schema`          | `str`             | `"events"` | Database schema for the stream table                     |
| `connection`      | `str \| None`     | project default | Named connection to use                             |
| `cursor`          | `str`             | `"rowid"`  | Cursor column for incremental processing                 |
| `fields`          | `dict \| None`    | `None`     | Schema definition (e.g. `{"id": "int64", "data": "string"}`) |
| `description`     | `str \| None`     | `None`     | Human-readable description                               |
| `tags`            | `list[str]`       | `[]`       | Tags for categorisation and filtering                    |
| `owner`           | `str \| None`     | `None`     | Owner identifier                                         |
| `auth`            | `dict \| None`    | `None`     | Per-stream authentication config                         |
| `rate_limit`      | `dict \| None`    | `None`     | Rate limiting config                                     |
| `validate_schema` | `bool`            | `False`    | Validate incoming events against `fields`                |
| `retention`       | `dict \| None`    | `None`     | Data retention policy                                    |

## Publishing Events

The `publish` function appends events to a stream table. It works both as a standalone call and inside the Interlace service (where it also triggers downstream models automatically).

### Async

```python
from interlace import publish

# Single event
result = await publish("user_events", {"user_id": "u_123", "action": "click"})

# Batch of events
result = await publish("user_events", [
    {"user_id": "u_123", "action": "click"},
    {"user_id": "u_124", "action": "signup"},
])

# Using the decorated function reference instead of a string name
result = await publish(user_events, {"user_id": "u_123", "action": "click"})
```

### Sync

```python
from interlace import publish_sync

result = publish_sync("user_events", {"user_id": "u_123", "action": "click"})
```

### Publish Result

Both functions return a dict describing the outcome:

```python
{
    "status": "accepted",
    "stream": "user_events",
    "rows_received": 2,
    "publish_id": "a1b2c3d4-...",
    "triggered_models": ["user_sessions", "daily_active_users"]
}
```

Each published row automatically receives `_interlace_published_at` and `_interlace_publish_id` metadata columns.

## Consuming Events

Interlace provides two consumption patterns: real-time in-process subscription and cursor-based batch consumption.

### Real-time Subscription

`subscribe` returns an async iterator that yields events as they are published within the same process:

```python
from interlace import subscribe

# One event at a time
async for event in subscribe("user_events"):
    print(f"New event: {event}")

# Batched (yield every 10 events or on timeout)
async for batch in subscribe("user_events", batch_size=10, timeout=5.0):
    process_batch(batch)

# With filtering
async for event in subscribe("user_events", filter_fn=lambda e: e.get("action") == "signup"):
    handle_signup(event)
```

**Subscribe parameters:**

| Parameter    | Type                           | Default | Description                                           |
| ------------ | ------------------------------ | ------- | ----------------------------------------------------- |
| `batch_size` | `int`                          | `1`     | Events to buffer before yielding (1 = one at a time)  |
| `timeout`    | `float \| None`                | `None`  | Seconds to wait between events before yielding partial batch |
| `filter_fn`  | `Callable[[dict], bool] \| None` | `None` | Only yield events where the function returns `True`   |

### Batch Consumption (Cursor-based)

`consume` and `ack` provide reliable, at-least-once processing backed by database cursors. Use this for batch processing, multi-process consumers, or distributed workloads.

```python
from interlace import consume, ack

# Pull a batch of unprocessed events
events = await consume("user_events", "analytics_worker", batch_size=100)

for event in events:
    process(event)

# Acknowledge processing to advance the cursor
await ack("user_events", "analytics_worker", events)
```

Each consumer tracks its own cursor position, so multiple consumers can process the same stream independently at different rates.

**Consume parameters:**

| Parameter       | Type         | Default | Description                                     |
| --------------- | ------------ | ------- | ----------------------------------------------- |
| `stream_name`   | `str`        | --      | Name of the stream to consume from              |
| `consumer_name` | `str`        | --      | Unique consumer identifier (tracks cursor)      |
| `batch_size`    | `int`        | `100`   | Maximum number of events to return              |
| `connection`    | `str \| None`| `None`  | Override connection name                         |

## HTTP Endpoints

When the Interlace service is running (`interlace serve`), streams are automatically exposed via REST endpoints.

### Publish

```bash
# Single event
curl -X POST http://localhost:8080/api/v1/streams/user_events \
  -H "Content-Type: application/json" \
  -d '{"user_id": "u_123", "action": "click"}'

# Batch
curl -X POST http://localhost:8080/api/v1/streams/user_events \
  -H "Content-Type: application/json" \
  -d '[{"user_id": "u_123", "action": "click"}, {"user_id": "u_124", "action": "signup"}]'
```

Returns `202 Accepted` with the publish result.

### Subscribe (Server-Sent Events)

```bash
curl -N http://localhost:8080/api/v1/streams/user_events/subscribe
```

Returns a persistent SSE connection. Events are delivered as they are published:

```
event: stream.event
data: {"stream": "user_events", "event": {"user_id": "u_123", "action": "click"}}
```

### Consume Batch

```bash
curl -X POST http://localhost:8080/api/v1/streams/user_events/consume \
  -H "Content-Type: application/json" \
  -d '{"consumer": "analytics_worker", "batch_size": 100}'
```

Returns:

```json
{
  "stream": "user_events",
  "consumer": "analytics_worker",
  "events": [{"user_id": "u_123", "action": "click", "_interlace_rowid": 1}],
  "count": 1
}
```

### Acknowledge

```bash
curl -X POST http://localhost:8080/api/v1/streams/user_events/ack \
  -H "Content-Type: application/json" \
  -d '{"consumer": "analytics_worker", "events": [{"_interlace_rowid": 1}]}'
```

### Endpoint Summary

| Method | Path                                  | Description                      |
| ------ | ------------------------------------- | -------------------------------- |
| GET    | `/api/v1/streams`                     | List all registered streams      |
| GET    | `/api/v1/streams/{name}`              | Get stream details and row count |
| POST   | `/api/v1/streams/{name}`              | Publish event(s)                 |
| GET    | `/api/v1/streams/{name}/subscribe`    | Subscribe via SSE                |
| POST   | `/api/v1/streams/{name}/consume`      | Consume a batch of events        |
| POST   | `/api/v1/streams/{name}/ack`          | Acknowledge processed events     |

## Streams as Model Dependencies

Stream tables are regular database tables, so downstream `@model` functions can reference them as dependencies. When events are published via the service, Interlace automatically triggers any models that depend on the stream.

```python
from interlace import model, stream

@stream(name="orders", schema="events", fields={"order_id": "string", "total": "float64"})
def orders():
    pass

@model(
    name="daily_revenue",
    materialise="table",
    dependencies=["orders"],
)
def daily_revenue(orders):
    return (
        orders.mutate(order_date=orders._interlace_published_at.cast("date"))
        .group_by("order_date")
        .aggregate(revenue=orders.total.sum(), order_count=orders.order_id.count())
    )
```

When you `POST` to `/api/v1/streams/orders`, the `daily_revenue` model is automatically enqueued for re-execution.

## Authentication

Configure per-stream authentication to protect HTTP endpoints:

```python
# Bearer token authentication
@stream(
    name="webhooks",
    auth={"type": "bearer", "token": "sk_live_abc123"},
)
def webhooks():
    pass

# API key authentication
@stream(
    name="partner_events",
    auth={"type": "api_key", "header": "X-API-Key", "key": "partner_key_abc"},
)
def partner_events():
    pass
```

Requests without valid credentials receive a `401 Unauthorized` response. Authentication is enforced only on the HTTP endpoints -- the programmatic `publish()` API bypasses it.

## Rate Limiting

Protect streams from excessive traffic with per-stream rate limits:

```python
@stream(
    name="high_volume",
    rate_limit={"requests_per_second": 100},
)
def high_volume():
    pass
```

Requests exceeding the limit receive a `429 Too Many Requests` response with a `retry_after` hint.

## Schema Validation

When `validate_schema=True` and `fields` are defined, incoming events are validated before insertion. Events missing required fields are rejected:

```python
@stream(
    name="typed_events",
    fields={"user_id": "string", "amount": "float64", "currency": "string"},
    validate_schema=True,
)
def typed_events():
    pass

# This succeeds
await publish("typed_events", {"user_id": "u_1", "amount": 9.99, "currency": "GBP"})

# This raises ValueError -- missing "currency"
await publish("typed_events", {"user_id": "u_1", "amount": 9.99})
```

When `validate_schema=False` (the default), events are accepted regardless of shape. If `fields` are defined but validation is off, the fields are still used to create the initial table schema.

## Retention

Configure automatic data retention policies:

```python
@stream(
    name="ephemeral_events",
    retention={"max_age_days": 30},
)
def ephemeral_events():
    pass

@stream(
    name="bounded_events",
    retention={"max_rows": 1_000_000},
)
def bounded_events():
    pass
```

## Tips

- **Streams create append-only tables.** Data is never updated in place -- each publish adds new rows.
- **Use `fields` for predictable schemas.** Without `fields`, the table schema is inferred from the first batch of events, which can lead to type mismatches on later batches.
- **Choose the right consumption pattern.** Use `subscribe()` for real-time, in-process reactions. Use `consume()`/`ack()` for reliable batch processing across restarts.
- **Name consumers uniquely.** Each `consumer_name` in `consume()` tracks its own cursor, so two workers with the same name will compete for events rather than process independently.
- **Stream tables work with incremental models.** Use the `_interlace_published_at` column or `rowid` cursor in downstream models for efficient incremental reads.
