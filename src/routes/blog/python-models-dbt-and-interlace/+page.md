---
title: 'Python Models: dbt and Interlace, Side by Side'
date: '2026-08-08'
author: Interlace Team
excerpt: dbt Python models participate fully in the DAG — that part is often misreported. The real differences are which platforms run them, which materialisations they support, and whether the function is testable on its own. A fair comparison, verified against both sets of docs.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Python Models: dbt and Interlace, Side by Side" date="2026-08-08" />

We have written before that Python and SQL models are interchangeable nodes in the same graph.
That is true of Interlace, and it is worth being careful about what it implies about dbt —
because the most common version of this comparison, including one we drafted ourselves, gets it
wrong.

**dbt Python models participate fully in dbt's DAG.** A SQL model can `ref()` a Python model,
and a Python model can `dbt.ref()` a SQL one. The dbt documentation is explicit about it, with
examples in both directions. Anyone claiming dbt Python models are "not real DAG nodes" has not
read the page.

The differences are real, but they are elsewhere. Every claim below about dbt is from dbt's
current [Python models documentation](https://docs.getdbt.com/docs/build/python-models); every
claim about Interlace was checked against the source.

## Where you can run one

This is the largest difference and the one that decides most cases.

dbt Python models require a data platform with a fully featured Python runtime. In practice
that means **Snowflake (Snowpark), BigQuery (BigFrames), or Databricks (PySpark)**. The code
runs _in the warehouse_, on the warehouse's Python runtime.

Interlace Python models run in the Interlace process, so they work on **any** engine —
including DuckDB and Postgres, where dbt has no Python model story at all.

The practical consequence: on a DuckDB or Postgres project, a dbt Python model is not slower or
more limited, it is unavailable. If your stack is one of the three supported warehouses, dbt's
approach has a real advantage in return — the computation happens next to the data, and never
crosses the network.

## What a model actually is

dbt's Python model is a function with a required signature, called by dbt with two arguments it
supplies:

```python
def model(dbt, session):
    dbt.config(materialized="table")
    orders = dbt.ref("stg_orders")
    return orders.groupBy("customer_id").agg(...)
```

Interlace's is an ordinary function whose **parameters name its upstreams**:

```python
from interlace import model

@model(strategy="merge", key="user_id")
def user_ltv(by_user):
    for batch in by_user.reader():
        yield score(batch)
```

The difference that matters is testability. `@model` registers the model and returns the
function **unchanged**, so it is callable in a unit test with no warehouse, no session and no
dbt object:

```python
>>> from models.user_ltv import user_ltv
>>> callable(user_ltv)
True
>>> user_ltv(fake_batches)     # a plain call, no infrastructure
```

dbt's `model(dbt, session)` requires both a `dbt` object and a live warehouse session, so
testing it means testing through dbt.

The data type differs too. dbt hands you a warehouse DataFrame — Snowpark, BigFrames or PySpark
depending on the platform, each with a different API, which is a portability cost if you ever
change warehouse. Interlace hands you Arrow, streamed as `RecordBatch`es, so memory stays
bounded on inputs far larger than RAM.

## What you can materialise

Both tools restrict Python models, in different places.

dbt supports `table` (default) and `incremental`. It does not support `view` or `ephemeral`,
and Python models **cannot reference ephemeral models** at all.

Interlace supports only `virtual` — its owned, snapshot-backed default. `view` and `ephemeral`
are rejected because both require SQL the engine can evaluate; `table` and `file` are rejected
because terminal delivery is SQL-only for now. The errors say so directly:

```
Python models cannot be ephemeral; ephemeral requires SQL (it is inlined as a CTE)
Python models cannot materialise as 'table' yet; write a SQL model over this model's output
```

Interlace Python models **can** read an ephemeral SQL model, which dbt's cannot. The upstream is
inlined as a CTE and never materialises:

```
 Model        Output    Strategy   Depends on   Rows   Time
 raw          virtual   replace    —              +3   0.06s
 pyconsumer   virtual   replace    mid            +3   0.06s
```

`mid` is the ephemeral model. It does not appear, because it was compiled into its consumer.

## Incremental work

Here dbt is straightforwardly ahead. dbt Python models support `incremental` with the same
incremental strategies as SQL models, subject to adapter support.

Interlace Python models **cannot** use `incremental_by_time`. Worse, the rejection arrives at
plan time rather than when the model is defined, so the decorator accepts a configuration the
planner will later refuse. That is a wart, and it is on our list.

If your Python transformation needs windowed incremental processing today, dbt on a supported
warehouse does it and Interlace does not.

## Side by side

|                                          | dbt                                      | Interlace                        |
| ---------------------------------------- | ---------------------------------------- | -------------------------------- |
| Platforms                                | Snowflake, BigQuery, Databricks          | any engine (DuckDB, Postgres, …) |
| Where the code runs                      | in the warehouse runtime                 | in the Interlace process         |
| SQL model can depend on it               | yes                                      | yes                              |
| It can depend on a SQL model             | yes                                      | yes                              |
| Can read an `ephemeral` upstream         | no                                       | **yes**                          |
| Materialisations                         | `table`, `incremental`                   | `virtual` only                   |
| `view` / `ephemeral`                     | no                                       | no                               |
| Incremental                              | **yes**                                  | no                               |
| Data type at the boundary                | Snowpark / BigFrames / PySpark DataFrame | Arrow `RecordBatch` stream       |
| Callable in a unit test without the tool | no                                       | **yes**                          |
| Reuse functions across models            | no                                       | yes — ordinary Python imports    |

## Choosing

Neither column is a win. The honest decision rule:

**dbt** if your warehouse is Snowflake, BigQuery or Databricks and you want computation to stay
next to the data, or if you need incremental Python models. Both are real advantages and we do
not have an answer to either.

**Interlace** if your engine is DuckDB or Postgres, where dbt Python models do not exist; if you
want to unit-test transformation logic as plain functions; or if the memory profile of streaming
Arrow matters more than warehouse-side execution.

The thing worth avoiding is picking on a claim neither tool actually makes. dbt Python models
are full DAG participants. Ours cannot do incremental. Both statements are inconvenient for the
usual marketing, and both are true.

---

Start with the [Python models guide](/docs/guides/python-models), or install it:

```bash
pip install interlaced
```
