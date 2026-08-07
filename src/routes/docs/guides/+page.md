---
title: Guides
---

# Guides

Practical guides for common Interlace tasks.

## Available Guides

**SQL Models** — Header configuration, dialects, materialisations, and scheduling for `.sql` models. [Read guide](/docs/guides/sql-models)

**Python Models** — Arrow-native Python models: streaming, cursors, and incremental patterns. [Read guide](/docs/guides/python-models)

**Dynamic Models** — Generate many models from a Python loop, without a templating DSL. [Read guide](/docs/guides/dynamic-models)

**Engines & Connections** — Configure the warehouse, named engines, attached databases, and secrets. [Read guide](/docs/guides/connections)

**Environments** — Production and sandbox environments, promotion, drift, and cleanup. [Read guide](/docs/guides/environments)

**Multi-Engine** — Pin models to different engines; Interlace moves data between them automatically. [Read guide](/docs/guides/multi-backend)

**Testing** — Sandboxes, plan previews, checks, and unit-testing Python models. [Read guide](/docs/guides/testing)

**Backfill** — Catch up or reprocess time windows with `interlace run` and `interlace restate`. [Read guide](/docs/guides/backfill)

**Streaming** — Durable HTTP event ingestion with `@stream`: idempotency, drift handling, retention. [Read guide](/docs/guides/streaming)

**Sources** — Pull from REST APIs and databases into the warehouse: the `interlace.sources` client (auth, pagination, retry) and incremental `cursor` pulls. [Read guide](/docs/guides/sources)

**Quality Checks** — Ten built-in check types plus Python checks; failures block promotion. [Read guide](/docs/guides/quality-checks)

**Schema Evolution** — Contracts, breaking-change classification, forward-only history, stream drift. [Read guide](/docs/guides/schema-evolution)

**REST API & Service** — The `interlace serve` daemon: HTTP API, API keys, live events, and the web UI. [Read guide](/docs/guides/rest-api)
