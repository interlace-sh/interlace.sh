---
title: 'Two Frameworks - dbt & SQLMesh, One Owner'
date: '2026-08-16'
author: Interlace Team
excerpt: Fivetran now owns dbt and SQLMesh. That is not the scandal it sounds like — both projects came out of it more openly licensed, not less. But there is now one roadmap where there were two, and it is pointed somewhere specific. Here is what we were building anyway, and what is actually different about it.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Two Frameworks - dbt & SQLMesh, One Owner" date="2026-08-16" />

In September 2025, Fivetran
[acquired Tobiko Data](https://www.fivetran.com/press/fivetran-acquires-tobiko-data-to-power-the-next-generation-of-advanced-ai-ready-data-transformation),
the company behind SQLMesh and SQLGlot. A month later it announced an all-stock merger with dbt
Labs, which
[completed on 1 June 2026](https://www.fivetran.com/press/fivetran-dbt-labs-complete-merger-to-create-the-data-infrastructure-for-trusted-ai-agents).

One company now owns both open-source SQL transformation frameworks.

## The part where we do not cry wolf

The obvious next paragraph writes itself: the open-source versions will be starved, the good
features will move behind a login, you should get out now.

We are not going to write that paragraph, because the evidence points the other way.

In March 2026 Fivetran
[contributed SQLMesh to the Linux Foundation](https://www.linuxfoundation.org/press/linux-foundation-welcomes-sqlmesh-project)
under open governance, with outside organisations as founding members. On the day the dbt merger
closed, dbt Core v2.0 shipped with the Rust engine that had previously been
[ELv2 relicensed to Apache 2.0](https://docs.getdbt.com/blog/dbt-core-v2-is-here) and moved into
the `dbt-core` repository. Both projects are more permissively licensed after the deals than
before them.

If your worry was "will the licence get worse", the honest answer so far is no, and anyone
telling you otherwise is selling something.

We should also declare an interest. Interlace's entire intermediate representation is
[sqlglot](https://github.com/tobymao/sqlglot) — the parser that came with the Tobiko
acquisition. Every model we compile is parsed, canonicalised and transpiled by a library Fivetran
now stewards. We are not neutral observers of this consolidation; we are downstream of it.

## The part that is actually true

Here is the thing that is left after the FUD is stripped out, and it is not nothing.

There were two independent answers to "what should a transformation framework be", built by two
teams who disagreed with each other in public, and now there is one owner and one roadmap. That
roadmap has been stated clearly and repeatedly: data infrastructure for AI agents, with a managed
platform at the centre of it. It is a coherent bet and it may well be the right one.

But a category with one roadmap is a category where certain arguments no longer have anywhere to
happen. If you think the interesting problem is something other than agentic AI over a managed
warehouse — if you think, for instance, that the interesting problem is that a working data
platform currently requires four tools that do not know about each other — there is now one fewer
venue for that argument.

We started building before either deal closed. The consolidation did not create the reason; it
just made the gap easier to describe.

## Clean models, in Python or SQL

That is the whole premise, and everything else is downstream of it.

A model is a `.sql` file containing SQL, or a `.py` file containing a function that returns Arrow.
Not SQL with a templating language wrapped around it, and not Python that generates SQL strings —
either language, used as itself, in the same DAG, with dependencies read out of the code rather
than declared alongside it:

```sql
-- models/stg_orders.sql
SELECT order_id, customer_id, cents_to_dollars(subtotal) AS subtotal FROM raw_orders
```

```python
# models/customer_risk.py
@model()
def customer_risk(customers, orders):
    return score(customers.table(), orders.table())   # a plain function over Arrow
```

The SQL file is valid SQL — you can paste it into any client. The Python file is a plain function
— you can call it in a unit test with no warehouse. Neither is a template.

## Four things that follow

**Nothing else has to run it.** Scheduling is in the tool: `schedule: {cron: "0 * * * *"}` or
`{every: "5m"}` on a model, a durable work queue with leases, retries and cancellation, and
`interlace serve` as the long-running process that holds them. dbt is the clear contrast —
orchestration is explicitly out of scope, and the answer is Airflow, Dagster or dbt Cloud: a
second system, with its own deployment, that has to be told about your DAG.

SQLMesh is closer, but the difference is worth being precise about, because "SQLMesh has a
scheduler" is easy to say and slightly wrong. A model's `cron` there declares how often that model
is _due_; `sqlmesh run` works out what is due and evaluates it. Something still has to invoke
`sqlmesh run`, and
[their own guide](https://sqlmesh.readthedocs.io/en/stable/guides/scheduling/) says so directly:
"You must run this command periodically with a cron job, a CI/CD tool like Jenkins, or in a
similar fashion." That is a scheduler in the sense of knowing what ought to run. It is not a
process that runs it, and the thing you end up deploying is still a crontab or a Kubernetes
CronJob wrapped around a CLI. `interlace serve` is that process.

**Events are a first-class input.** A `@stream` is a durable HTTP ingestion endpoint: publishes
land in a write-ahead log and are fsynced before the 200, then micro-batched into the warehouse
exactly once via an in-warehouse watermark. The closest thing in shape is
[Cloudflare's Data Platform](https://blog.cloudflare.com/cloudflare-data-platform/), where
Pipelines ingests to durable streams and writes Iceberg into R2 — the same idea, and a good one.
The difference is where it runs: theirs is a hosted platform billed per GB, ours is a process on
your machine writing to your warehouse. If your events already belong on Cloudflare, use theirs.
If they belong next to your models, there was not previously an option that was also a
transformation framework.

**Column-level lineage, in the open-source tool.** `interlace impact orders.amount` gives the
column-level blast radius — every downstream column derived from that one — and the same graph
drives change classification, so a change that provably touches only columns nothing consumes does
not rebuild the consumer. SQLMesh has column-level lineage too, and had it first. The comparison
that matters is with dbt, where lineage of this kind lives in dbt Explorer rather than in the
thing you run locally.

**It can write to tables it does not own.** This is the one people are surprised by. A model can
materialise into an external database — an attached Postgres or DuckDB, a serving table your
application reads — with `merge`, `append`, `full_merge` or windowed `incremental` semantics, and
it never drops that table. Or into a Parquet/CSV/JSON file. SQLMesh's
[external models](https://sqlmesh.readthedocs.io/en/stable/concepts/models/external_models/) are
the mirror image: they describe tables it does not manage so it can _read_ them and include them
in lineage. Reading outward is solved in both. Writing outward — reverse ETL as an ordinary model
with an ordinary strategy, gated by the same checks — is the part we added.

## Where we are a cousin, not an original

It would be dishonest to present the architecture as novel. Fingerprint the canonical form of a
model, store the result in a versioned physical table, point a per-environment view at it, and
promote by moving the view: that is SQLMesh's design, and they published it first. Our snapshot
tables and virtual environments are the same idea, arrived at for the same reasons, on top of the
same parser.

What we did differently is scope. SQLMesh is a transformation framework that knows when its
models are stale. Interlace is trying to be the whole spine — transformation, orchestration, ingestion and the
control plane — in one process, on the theory that the seams between those four tools are where
data platforms actually break.

That is a bet, not a proof. It might be wrong.

## What you give up

No package ecosystem. `dbt_utils` is a large body of tested SQL that thousands of people use, and
we have the mechanism to write your own but not the library. No semantic layer: MetricFlow has no
equivalent here. Far fewer battle-tested adapters — DuckDB and Postgres are exercised properly,
the rest are honest alpha. And a project this young has had a fraction of the hostile production
exposure that either of the others survived years ago.

If you are running dbt or SQLMesh happily today, none of the above is a reason to move. Both are
still open source, both got more open in the last year, and both have a company behind them that
is considerably better resourced than we are.

The argument for this one is narrower: if you have found yourself running a transformation tool
plus an orchestrator plus an ingestion service plus the glue between them, and the glue is what
keeps breaking, it is worth an afternoon.

---

Start with the [introduction](/docs/getting-started), read
[why a unified abstraction](/blog/why-unified-abstraction) for the longer version of the argument,
or install it:

```bash
pip install interlaced
```
