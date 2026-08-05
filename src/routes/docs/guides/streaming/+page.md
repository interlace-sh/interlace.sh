---
title: Streaming
---

# Streaming

Streams are the ingestion layer: durable, append-only event logs with HTTP endpoints, exactly-once loading into the warehouse, and automatic wiring to the models that read them.

## Declaring a Stream

```python
from interlace import stream

@stream(
    "orders",
    schema={"order_id": "string", "customer_id": "integer", "total": "double"},
    idempotency_key="order_id",
    retention="7d",
)
def orders(event):
    return event    # placeholder — the function body is never executed
```

| Parameter         | Required | Default      | Description                                                     |
| ----------------- | -------- | ------------ | --------------------------------------------------------------- |
| name (positional) | yes      | —            | Stream name; the warehouse table is `streams.<name>`            |
| `schema`          | yes      | —            | Field name → type                                               |
| `idempotency_key` | no       | —            | Payload field used to deduplicate                               |
| `retention`       | no       | keep forever | How long materialised events stay in the log (`7d`, `12h`, ...) |
| `on_schema_drift` | no       | `"reject"`   | `reject`, `evolve`, or `quarantine`                             |

Field types: `int`/`integer`/`bigint`, `double`/`float`/`decimal`, `text`/`string`/`varchar`, `bool`/`boolean`, `timestamp` (ISO strings), `json`.

## Publishing Events

With the [daemon](/docs/guides/rest-api) running, `POST /streams/{name}` accepts one event or a batch:

```bash
curl -X POST localhost:8000/streams/orders \
  -H 'content-type: application/json' \
  -d '{"order_id": "o-1001", "customer_id": 42, "total": 99.5}'
```

```json
{ "accepted": 1, "deduplicated": 0, "last_offset": 1, "quarantined": 0 }
```

The event is **durable before the response returns** — appended to a write-ahead-logged SQLite log at `.interlace/streams.db`. Loading into the warehouse is asynchronous.

### Idempotency

If the stream declares an `idempotency_key`, re-sending an event with a seen key is acknowledged but not re-appended (`deduplicated` counts it). Retrying webhooks is therefore always safe. Deduplication is per stream and lasts as long as the event lives in the log (i.e. until retention trims it).

### Backpressure

If the warehouse falls far behind (100,000 unmaterialised events on one stream), publishing returns **429** with a retry hint rather than accepting unbounded lag.

## From Log to Warehouse

The daemon micro-batches: a flusher coalesces bursts (50 ms), then loads events in 5,000-row batches into `streams.<name>`, which carries the declared columns plus:

| Column         | Meaning                         |
| -------------- | ------------------------------- |
| `_offset`      | Position in the durable log     |
| `_ingested_at` | When the log accepted the event |

Data and the stream's watermark move in one transaction — the watermark lives **in the warehouse** (`streams._watermarks`), so it commits atomically with the data. A crash leaves either the old watermark (events re-read, stage overwritten — no duplicates) or the new one; it never double-loads or drops events (exactly-once into the warehouse). Poll `GET /streams/{name}` and compare `head` (accepted) with `watermark` (materialised) to see events land.

## Consuming Streams in Models

Reference the stream table like any other:

```sql
-- models/order_facts.sql
SELECT order_id, customer_id, total
FROM streams.orders
```

The daemon enqueues models that read a stream — plus their descendants — after each flush, with watermark-keyed idempotent runs so repeated flushes at the same position debounce into one run.

## Schema Drift

`on_schema_drift` controls what happens when an event doesn't match the declared schema. Validation happens **before** durability, per request:

- **`reject`** (default) — any undeclared field or type mismatch fails the whole request with `400`. Missing declared fields are fine (they load as `NULL`).
- **`evolve`** — unknown fields are accepted and become new columns on the warehouse table (types inferred; existing rows read as `NULL`). Incompatible changes to _declared_ fields still fail — evolution never hides breakage.
- **`quarantine`** — conforming rows are accepted; violating rows are diverted to a shadow table `streams.<name>__quarantine` with `error` and `payload` columns, and counted in the response's `quarantined`. The request succeeds.

## Retention

`retention` bounds the durable log, not the warehouse table: an event is trimmed from the log only once it is **both materialised and older than the window**. The sweep runs on the daemon's scheduler loop. Without `retention`, the log keeps everything.

## Observability

```bash
interlace streams        # per stream: head, watermark, pending, drift mode, retention
```

`GET /streams`, `GET /streams/{name}` (includes the last 20 payloads), and `stream.flushed` events on the [live event feed](/docs/guides/rest-api#live-events) cover the same from the API and web UI.

## Reverse-ETL Terminals

Streaming is the inbound edge; **terminal materialisations** are the outbound one. A model with `materialise: table` or `materialise: file` produces no owned snapshot and no environment view — instead its resolved query result is delivered to an external destination each time it builds. Terminals are the other half of the platform's I/O boundary, so they're worth knowing about here even though they're declared on ordinary [SQL models](/docs/guides/sql-models#terminal-outputs-external-tables-and-files).

```sql
/* interlace:
  materialise: table
  target: crm.main.customer_scores
  strategy: merge
  key: customer_id
*/
SELECT customer_id, score FROM customer_value
```

- **Files** — `materialise: file` with `format: parquet | csv | json` and `path`, written via a DuckDB `COPY`.
- **External tables (reverse ETL)** — `materialise: table` with `target: <alias>.<schema>.<table>`, where `alias` is a database wired in through the project's `attach:` config (Postgres, SQLite, another DuckDB). `strategy` picks delivery: `full` (DELETE all + INSERT — the live table is never dropped, so grants and readers survive), `append`, or the keyed `merge` / `full_merge` (which reuse the same strategy builders as owned models, pointed at the external catalog). `incremental_by_time` works here too.
- **Environment-gated** — terminals fire in `prod` only by default, so a `dev` apply builds and fingerprints the model but skips delivery. Widen with `environments: [dev, prod]`.

The full field reference is in the [SQL models guide](/docs/guides/sql-models#terminal-outputs-external-tables-and-files).

## Next Steps

- [REST API](/docs/guides/rest-api) — the daemon, auth, and events
- [Dependencies](/docs/core-concepts/dependencies) — how stream consumers are wired
