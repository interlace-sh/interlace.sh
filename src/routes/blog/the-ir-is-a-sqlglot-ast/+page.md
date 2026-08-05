---
title: 'The IR Is a sqlglot AST'
date: '2026-08-02'
author: Interlace Team
excerpt: Dropping Ibis removed a heavyweight dependency for zero lost capability, because Ibis compiles to sqlglot — which is already our intermediate representation. What the rebuild bet on, and what it refused.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="The IR Is a sqlglot AST" date="2026-08-02" />

Every data tool has an intermediate representation, whether it admits to one or not. It is the
thing a model becomes after parsing and before execution, and it quietly decides what the tool
can do. dbt's IR is templated text. Ours, in the 0.x line, was effectively a pandas DataFrame,
which is why [nothing worked properly](/blog/what-we-got-wrong).

The rebuild committed to one sentence:

> The canonical IR is a sqlglot AST + Arrow schema. The canonical wire format is an Arrow
> `RecordBatchReader`. Materialisation happens exactly once, at the sink, as a single native
> SQL statement executed inside the owning engine.

Everything else in Interlace 2.0 follows from that.

## Why not Ibis

Ibis is a good library and 0.x was built on it. Dropping it was the single largest deletion in
the rebuild, so it deserves a real justification rather than a preference.

Ibis was doing two jobs for us. As a **data plane**, it moved results between models — and it
sits on Arrow underneath, so we were paying for a wrapper around a format we could use
directly. As an **expression builder**, it turned Python into SQL — and it compiles to
sqlglot, which is the AST we had already decided to make canonical.

Both roles were covered without it. Removing Ibis dropped a heavyweight dependency and its
governance risk for zero lost capability. Remote engines connect over ADBC rather than Ibis
backends, which is a narrower and better-specified contract.

That is the whole argument. Not "Ibis is bad" — "Ibis is a layer over the two things we had
already chosen".

## What an AST IR buys

A sqlglot AST is a parsed, structured, dialect-neutral representation of the query. Three
consequences matter.

**Strategies become AST builders, not string templates.** A strategy is the thing that turns a
model's query into a table. In 0.x, each one wrote DuckDB SQL by hand. Now each one takes the
model's query expression and its target, and emits a short list of SQL statements that `apply`
runs in one transaction. Dialect appears only at `transpile()`, at the very end.

The payoff is that no strategy needs the model's column list. A model's schema can change
without a hand-written migration, because a definition change simply mints a new snapshot
table.

**Dependencies are parsed, not declared.** Because we hold the AST, the `FROM` and `JOIN`
clauses are structure rather than text. A reference whose name — or whose last dotted segment
— matches another model becomes a DAG edge. CTEs are excluded, because the parser knows what a
CTE is.

```sql
/* interlace:
  strategy: merge
  key: order_id
*/
SELECT order_id, customer_id, amount
FROM raw_orders
```

There is no `ref()` to write. `raw_orders` is a real table reference that happens to resolve
to a model, and it is rewritten to the right snapshot at build time.

**Change classification can be semantic.** This is the one that pays for the whole decision.
Because we can compare two ASTs rather than two strings, `interlace plan` can tell the
difference between a change that alters a model's output and one that does not — and then
narrow that further, per column, to work out which downstream models are genuinely affected.

The analysis is deliberately conservative. Adding `avg(amount) AS avg_amount` to a `SELECT` is
additive. Anything touching existing expressions — or anything the analyser cannot prove safe,
such as a `SELECT *` rewrite, a `DISTINCT`, or a positional `GROUP BY` — is treated as
breaking. Ambiguity always errs toward rebuilding, never toward a false skip.

## Arrow at the boundaries

The wire format is an Arrow `RecordBatchReader`. Data crossing into a Python model arrives as
Arrow and leaves as Arrow.

```python
from interlace import model


@model(depends_on=["by_user"], strategy="merge", key=["user_id"])
def user_ltv(by_user):
    for batch in by_user.reader():
        ...
        yield batch
```

Because it is a reader rather than a table, a Python model can stream. Memory stays bounded no
matter how large the upstream is, which is the property 0.x's `.execute()` → pandas →
`memtable()` round-trip destroyed at every hop.

pandas and Polars are still available — as optional extras, at the edges, when you actually
want a DataFrame. They are not in the core and they are not the interchange format.

## What the rebuild refused

Three refusals are worth stating plainly, because each one is a thing many peers do.

**No Jinja.** Python is the macro language. If you need to generate forty models from a
config, write a loop — the [dynamic models guide](/docs/guides/dynamic-models) covers the
patterns and the traps. A templating DSL inside SQL strings is a second language with no
parser, no types and no editor support.

**No `ref()`-as-text.** References resolve at the AST level, as above.

**No pandas in the core.** Arrow only.

The result is a core install with nine runtime dependencies: sqlglot, duckdb, pyarrow,
pydantic, typer, rich, cronsim, tenacity and pyyaml. The HTTP daemon is an optional `service`
extra.

## The shape it produced

Five lines describe the whole system:

- The IR is a sqlglot AST; the wire format is an Arrow `RecordBatchReader`; strategies are AST
  builders and dialect appears only at `transpile()`.
- Storage defaults to DuckLake — Parquet with a SQL catalog — opened as DuckDB's primary
  database.
- The control plane, holding snapshots, intervals, the run queue, events and API keys, is
  SQLite in WAL mode.
- Streams live in their own durable log; the materialiser commits data and watermark in one
  warehouse transaction, giving exactly-once without distributed coordination.
- No Jinja, no pandas in core, no external orchestrator.

The next post takes the second and third of those apart: how fingerprinted snapshots and
environment views make a development sandbox cost nothing.

---

Read the [core concepts](/docs/core-concepts) for how the IR becomes a plan, or
[dependencies](/docs/core-concepts/dependencies) for the resolution rules in detail.
