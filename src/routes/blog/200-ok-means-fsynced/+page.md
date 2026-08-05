---
title: '200 OK Means Fsynced'
date: '2026-08-05'
author: Interlace Team
excerpt: The 0.x stream log was an in-memory queue that lost data on restart. The rebuilt one runs synchronous=FULL, so a 200 survives power loss and not merely a process crash. What that costs, and what it buys.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="200 OK Means Fsynced" date="2026-08-05" />

Of the eight defects that ended the 0.x line, the fourth is the one that should have been
embarrassing at the time:

> Non-durable streaming — in-memory asyncio queues (restart = loss), ack-before-process.

We were describing that as durable ingestion. It was an `asyncio.Queue` that acknowledged the
publisher before doing anything with the event. If the process restarted, the buffer went with
it, and the publisher had already been told the write succeeded.

This post is about what replaced it, because the fix is more interesting than the bug.

## What a 200 has to mean

An ingestion endpoint makes a promise every time it returns a status code. The publisher — a
webhook, a device, another service — takes that 200 as permission to forget. If the event only
exists in your process memory at that moment, you have accepted responsibility for data you
can lose to a restart.

So the contract is stated in the code, at the top of the stream log:

> `append` must not return before events are durable, so a 200-OK means "fsynced".

Not "queued". Not "written to the page cache". Fsynced. The stream log runs SQLite in WAL mode
with `synchronous=FULL`, which means the write survives power loss, not merely a clean process
crash. Batched publishes amortise the fsync so the cost is paid per batch rather than per
event.

That is a deliberate trade. `synchronous=FULL` is slower than the alternatives. It is the only
setting under which the sentence above is literally true, and a durability claim that is
approximately true is not a durability claim.

## Publishing

Declare a stream, and it gets an HTTP endpoint:

```python
from interlace import stream


@stream(
    "orders",
    schema={"order_id": "string", "total": "double"},
    idempotency_key="order_id",
    retention="7d",
)
def orders(event): ...
```

```bash
curl -X POST localhost:8000/streams/orders \
  -H 'content-type: application/json' \
  -d '{"order_id": "o1", "total": 49.5}'
```

```json
{ "accepted": 1, "deduplicated": 0, "last_offset": 1, "quarantined": 0 }
```

Send the same event again and the response tells you plainly what happened:

```json
{ "accepted": 0, "deduplicated": 1, "last_offset": 1, "quarantined": 0 }
```

An `idempotency_key` makes retries safe by construction. A webhook that fires twice because it
did not see your first response produces one row, and the second publish is acknowledged
rather than rejected — retrying is always correct.

## Exactly-once, without distributed coordination

Getting an event into a durable log is the easy half. The hard half is moving it into the
warehouse exactly once.

The usual failure mode is a two-step commit: write the rows, then record how far you got. Crash
between those and you either duplicate a batch on restart or lose one, depending on the order
you chose.

Interlace avoids the problem rather than handling it. A micro-batch flusher commits **the data
and the watermark in one warehouse transaction**. The record of what has been consumed lives in
the same transaction as the consumption. There is no window in which they can disagree, and
therefore no distributed coordination to get wrong.

Consumer offsets are committed transactionally with fencing tokens, which kills the read/ack
race the same way — by construction, not by retry logic.

Once flushed, the rows are an ordinary table:

```sql
SELECT order_id, total
FROM streams.orders
```

A flush triggers the models that read the stream. The DAG does not care that the data arrived
over HTTP.

## When the warehouse falls behind

A durable log with no backpressure is a queue that grows until the disk fills.

When the warehouse cannot keep up, publishes get **429** rather than an unbounded backlog. A
429 is a real answer: the publisher can retry, slow down, or shed load. Accepting an event you
cannot materialise is worse than refusing it, because it converts a visible problem into an
invisible one.

## Schema drift is a decision, not an accident

Producers change payloads without asking. The interesting question is not whether that happens
but what you want to happen when it does — and that is a policy choice, so it is configuration:

| `on_schema_drift` | Behaviour                                         |
| ----------------- | ------------------------------------------------- |
| `reject`          | **default** — the publish fails with 400          |
| `evolve`          | new columns are added to the stream table         |
| `quarantine`      | offending events divert to `<stream>__quarantine` |

The default is `reject`, which is the conservative choice: an unexpected field is an error
until you say otherwise. `quarantine` is the interesting one for production, because it keeps
the pipeline moving while preserving the bad events for inspection instead of dropping them.

## What this cost

Honesty about the numbers: the target latency envelope — a 200-OK p99 under 25 ms, publish to
queryable p95 under a second — is a **design goal, not a measured guarantee**. We have not
published benchmarks and will not claim them until we have.

What is verifiable is the durability property, because it is a configuration fact rather than a
performance claim. `synchronous=FULL` either is or is not set, and the transaction either does
or does not contain both the data and the watermark.

The default log backend is SQLite. The `StreamLog` is a Protocol with `append`, `read`, `heads`,
`lease`, `commit` and `trim` — Postgres and broker-backed implementations sit behind the same
interface, though only the SQLite one ships today.

Tomorrow's post covers the change that made this release 2.0 rather than 1.1: what `materialise`
means now, and why the old `export:` block had to go.

---

Read the [streaming guide](/docs/guides/streaming) for retention, quarantine and the flush
mechanics, or the [REST API reference](/docs/guides/rest-api) for the publish endpoint.
