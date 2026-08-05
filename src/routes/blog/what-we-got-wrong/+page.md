---
title: What We Got Wrong the First Time
date: '2026-08-01'
author: Interlace Team
excerpt: Three independent reviews of Interlace 0.2.1 found eight structural defects. None of them could be patched. Here is the list, and why it ended in a rewrite rather than a refactor.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="What We Got Wrong the First Time" date="2026-08-01" />

Interlace 0.1.0 shipped on 20 February 2026. On paper it was a complete product: a `@model`
decorator for Python and SQL, a `@stream` decorator with HTTP endpoints and five adapters,
cursor-based backfill, six data-quality check types, five schema-flexibility modes, retry
policies with circuit breakers, Prometheus metrics, OpenTelemetry tracing, a REST API with
twenty-plus endpoints, and a Svelte web UI with an ELK.js DAG canvas.

Two days later, 0.1.1 resolved all 590 mypy errors in the codebase. That number is the tell.

By late February we had 0.2.0 out with API-key auth, rate limiting and a 32-endpoint OpenAPI
spec. Then the CHANGELOG stops for five months. This post is about why.

## The reviews

We put 0.2.1 through three independent reviews. They converged on eight defects. What made
the list serious was not the individual entries — it was that every one of them sat below the
line where a patch could reach.

**1. Broken laziness.** Ibis was a veneer. Every model boundary ran `.execute()`, produced a
pandas DataFrame, and fed it back in through `ibis.memtable()`. The expression API promised
deferred execution and the runtime delivered eager materialisation at every hop. A ten-model
chain round-tripped the whole dataset through Python memory nine times.

**2. Dialect lock-in.** Strategies emitted raw DuckDB SQL strings. The portability story was
a claim about Ibis, not a property of our code — the moment a strategy wrote SQL by hand, the
dialect was baked in.

**3. No state model.** Change detection was file hashes and nothing else. No versioned
snapshots, no virtual environments, no plan/apply, no interval ledger. "Has this file
changed?" is a much weaker question than "is this output provably identical?", and everything
interesting is built on the second one.

**4. Non-durable streaming.** In-memory asyncio queues. A restart lost the buffer, and the
publish path acknowledged before processing. We were describing this as durable ingestion. It
was a queue that happened to survive as long as the process did.

**5. Cron-loop orchestration.** One global run lock serialised every flow. Two pipelines that
shared nothing still waited for each other.

**6. Fake async.** Synchronous `.execute()` calls blocked the worker threads, and what we
called a connection pool was a semaphore handing out fresh connections.

**7. A 1,000-line Executor coupled to the Rich display.** Execution logic and terminal
rendering were the same object. There was no way to run the engine without the console, which
is a problem when the engine needs to run inside a daemon.

**8. Column lineage computed but never used.** We calculated it, displayed it in the UI, and
then made every planning decision at model granularity anyway. The most valuable thing the
system knew was decorative.

## Why not refactor

The honest reason is that defects 1, 2 and 3 are the same defect wearing three coats.

An intermediate representation determines what a data tool can do. If your IR is "a pandas
DataFrame at every boundary", you cannot have laziness, you cannot have portability, and you
cannot fingerprint a model's semantics — only its bytes. Fixing change detection means
knowing what the query _means_, which means an AST. Fixing portability means never writing
dialect-specific strings, which means an AST. Fixing laziness means the boundary is a stream,
not a materialised frame.

Every path led to replacing the layer everything else sat on. At that point a refactor is a
rewrite with worse constraints.

The second reason is subtler and comes from 0.1.2's release notes, which contain this line:

> Corrected all three roadmap documents to reflect actual implementation status. `@stream`
> decorator, testing framework, cursor-based backfill, and forward-only migrations were fully
> implemented but documented as "planned".

Read that carefully. We had shipped four significant features and did not know it. The
codebase had outrun our understanding of it in both directions — things documented as working
that were not, and things working that were documented as missing. That is a symptom of a
system nobody can hold in their head.

## What we kept

Not much code. A great deal of design.

The 0.x line was right about the shape of the problem: one tool covering ingestion,
transformation and orchestration, with models as the single abstraction. Nothing in the
reviews challenged that. It was right that Python and SQL should be peers rather than one
being an escape hatch from the other. It was right that checks belong in the pipeline rather
than beside it.

It was also right about the market. No open-source tool owns ingestion, transformation and
orchestration in one process — and since then the space has consolidated sharply. Fivetran
completed its dbt Labs merger on 1 June 2026, having already acquired Tobiko, the company
behind SQLMesh and SQLGlot, in September 2025. SQLMesh moved to the Linux Foundation in March 2026. Both major transformation frameworks now sit in one company's portfolio.

So the rebuild kept the thesis and threw away the implementation. Five months later,
1.0.0 shipped on a sqlglot AST with an Arrow wire format, versioned snapshots, virtual
environments, a durable stream log and a plan that classifies changes before anything runs.

Each of the eight defects maps to a specific fix. The next post is about the one that
mattered most: choosing the intermediate representation, and why dropping Ibis cost us
nothing at all.

---

Interlace is MIT-licensed and requires Python 3.12+. Start with the
[introduction](/docs/getting-started), or read the
[architecture](/docs/core-concepts) for the design that came out of this.
