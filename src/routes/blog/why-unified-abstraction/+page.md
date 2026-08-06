---
title: Why We Built a Unified Abstraction
date: '2026-08-01'
author: Interlace Team
excerpt: A typical data stack runs four tools to do one job, and the failures live in the seams between them. Here is the case for making a model the only abstraction — and where one abstraction is not enough on its own.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Why We Built a Unified Abstraction" date="2026-08-01" />

Consider what a data engineer has to learn before writing a single useful transformation on a
typical 2026 stack.

dbt, for SQL models, sources, tests and macros. Airflow or Dagster, for scheduling, sensors and
retry logic. dlt, Airbyte or Fivetran, for ingestion. Python scripts for anything SQL cannot
express. Then YAML to configure all of it, and a growing pile of glue to hold the pieces
together.

Each of those tools is good. dbt genuinely standardised SQL transformation. Airflow's operator
ecosystem is unmatched. dlt does schema inference and incremental loading better than most
hand-written extractors. The problem is not the tools.

**The problem is the seams.**

## Where failures actually live

Your ingestion layer writes to a landing zone. Your transformation layer reads from it. Nothing
in either tool knows that this handoff exists — it is a convention, held together by a table
name and an assumption about timing.

That is where things break, and they break quietly. An upstream API changes its response shape;
the loader happily writes the new columns; the transformation reads the ones it expects and
silently produces a narrower result. A load runs late; the transformation runs on schedule
anyway and publishes yesterday's numbers. A model fails; the orchestrator retries it; the
retry succeeds against half-written data.

The debugging story is worse than the failure. Testing a dbt model uses one framework. Testing
a Python script uses another. Testing a dlt pipeline uses a third. When something goes wrong at
2am, the answer is spread across three dashboards, and none of them knows about the other two.

None of this is hypothetical. It is the ordinary experience of running a stack where no single
component can see the whole path from source to dashboard.

## Software engineering solved this

The same fragmentation existed in general programming and got resolved through abstraction
rather than integration.

Functions unified computation — nobody uses a different tool for arithmetic than for string
processing. Interfaces decoupled implementation from use. Package managers unified dependency
resolution, replacing a manual, error-prone, entirely social process.

In each case the win was not a better tool for each job. It was one concept that covered all of
them, so the seams disappeared instead of being managed.

Data engineering is on the same arc, roughly a decade behind. We still have a dedicated tool
per concern, each with its own mental model, and we still spend real effort on the glue.

## One abstraction

Interlace is built on a single idea: **a model is a query or a function that produces a table,
and everything is a model.**

A SQL model is a file. Dependencies come from the query itself — there is no `ref()` to write,
because the parser can see the `FROM` clause:

```sql
/* interlace:
  strategy: merge
  key: customer_id
  checks:
    - not_null: customer_id
*/
SELECT customer_id, name, tier FROM raw_customers
```

A Python model is a function. Its parameters name its upstreams:

```python
from interlace import model


@model(strategy="merge", key=["user_id"])
def user_ltv(by_user):
    for batch in by_user.reader():
        yield score(batch)
```

These are not two systems with a bridge between them. They are two spellings of one node type.
A SQL model can select from a Python model, and a Python model can take a SQL model as a
parameter, because both resolve to entries in the same graph.

Ingestion is the same abstraction again. A model with no upstreams is a source — it pulls from
the outside world and participates in the DAG like anything else:

```python
@model(strategy="merge", key=["event_id"])
def raw_events():
    import httpx, pyarrow as pa

    response = httpx.get("https://api.example.com/events")
    return pa.Table.from_pylist(response.json())
```

You can call dlt inside that function if you want its schema inference. The point is not to
replace it — the point is that the extraction is now a node in the graph rather than a separate
system writing to an agreed table name.

## What collapses

**The handoff becomes an edge.** When ingestion is a model, the dependency between extraction
and transformation is a real edge in a real graph. When the API changes shape, you find out in
the same place you find out about a broken join.

**One testing pattern.** The decorator registers the model and returns the function _unchanged_,
so a Python model is an ordinary function you can call in a unit test with no warehouse and no
fixtures. SQL models are covered by the same checks that gate production.

**One deployment.** `interlace serve` runs the scheduler, the HTTP API, stream ingestion and a
web UI in one process. There is no orchestrator to deploy alongside it and no broker to operate.

**One vocabulary.** A new engineer learns what a model is, and can then read, write and debug
any step — extraction, transformation, Python or SQL.

## One abstraction is not enough

This is the part where the argument would usually stop, and it should not.

A shared interface removes the seams. It does not, by itself, tell you whether a change is safe
— and "safe" is what actually keeps people awake. Two further things are doing that work.

**Changes are previewed, not discovered.** `interlace plan` fingerprints every model and
classifies each change before touching the warehouse. Because the comparison is between parsed
queries rather than file hashes, a downstream model whose output is provably identical is
reused rather than rebuilt:

```
$ interlace plan
 Model         Change    Category      Build
 orders        modified  non_breaking  rebuild
 order_stats   modified  non_breaking  reuse
```

A plan containing breaking changes refuses to apply without `--force`, which makes the
classification an automated review gate rather than a report.

**Ingestion is durable, not best-effort.** Models cover data you pull on a schedule. They do not
cover events arriving continuously, so streams fill that in — without introducing a second
mental model. Declare one, POST to it, and the row is durable before the response returns,
deduplicated by idempotency key, and materialised exactly once into a table that SQL models read
like any other.

## What this does not replace

Interlace is not the answer to everything, and pretending otherwise would undermine the rest of
the argument.

dbt has an ecosystem we will not match for years, and an adapter for every warehouse you might
already be paying for. Airflow handles cross-system orchestration — the kind that reaches
outside your data platform entirely — far better than we intend to. Spark processes volumes
Interlace is not designed for.

Engine coverage is closer than it looks — DuckDB, DuckLake, MotherDuck, Postgres, Redshift,
Snowflake, BigQuery and Spark all run models, with near-full strategy support on each. What is
not comparable is how proven they are: only the DuckDB family and Postgres are tested in CI,
Spark is beta, and the four cloud warehouses are alpha. They are dialect-correct and
unit-tested, but they have not yet run against a live account, and that is a real difference
from a tool with years of production mileage on those platforms.

What Interlace is for is the common case: a team whose warehouse fits on one machine, who are
running four tools to do one job, and who would rather spend the effort on pipelines than on the
glue between them.

The next post is about the decision that made it possible — what a model actually compiles to,
and why that choice determines everything else.

---

Interlace is MIT-licensed and requires Python 3.12+. Start with the
[introduction](/docs/getting-started), or install it:

```bash
pip install 'interlaced[service]'
```
