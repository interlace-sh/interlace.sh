---
title: 'A Python Model Is Just a Function'
date: '2026-08-04'
author: Interlace Team
excerpt: A .py model and a .sql model are the same kind of node. Either can depend on the other, in either direction, and the planner does not care which you wrote. Here is that claim running in the hot path of a 25-million-row DAG.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="A Python Model Is Just a Function" date="2026-08-04" />

Most tools that support both SQL and Python support one of them properly. Python arrives as an
escape hatch: a different execution path, a different set of available features, often a
different platform requirement, and a strong implicit suggestion that you should have written
SQL instead.

In Interlace a `.py` model and a `.sql` model are the same kind of node. Either can depend on
the other, in either direction, and the planner does not distinguish between them. This post
shows that claim running rather than asserts it.

## The graph

The benchmark project in the repository is a ten-model DAG over 25 million synthetic events.
It is not a toy: the numbers are generated in-engine so there is nothing to download, and the
fan-out does real, repeated work.

The chain that matters here is four models long:

```
events.sql  →  by_user.sql  →  user_ltv.py  →  top_products.sql
```

A Python model sits in the middle. Its upstream is SQL. Its downstream is SQL. Nothing about
the surrounding models acknowledges that the middle one is written in a different language.

## The Python model

```python
"""A Python model in the hot path: 100k user rows stream through Arrow."""

import pyarrow as pa
import pyarrow.compute as pc

from interlace import model


@model(depends_on=["by_user"], strategy="merge", key=["user_id"])
def user_ltv(by_user):
    for batch in by_user.reader():
        score = pc.add(pc.multiply(batch.column("spend"), 0.1), batch.column("events"))
        yield pa.RecordBatch.from_arrays(
            [batch.column("user_id"), batch.column("spend"), pc.round(score, 2)],
            names=["user_id", "spend", "ltv"],
        )
```

Three things are worth pulling out.

**The parameter is the dependency.** `by_user` is not a string to be resolved later; it is the
name of another model, and the function signature is the edge. For SQL models the same edge
comes from parsing the `FROM` clause. Both produce identical entries in one graph.

**It streams.** `by_user.reader()` yields Arrow `RecordBatch`es, and the function is a
generator. Memory stays bounded regardless of how far you scale `events.sql` — you can raise
the row count by an order of magnitude and this model's footprint does not move.

**The strategy is the same strategy.** `merge` here is the same keyed upsert a SQL model gets,
compiled the same way, running as SQL in the warehouse. Python produced the rows; it did not
take over the write path.

## The SQL either side

Upstream, plain SQL with no header at all, which means it takes the defaults —
`materialise: virtual`, `strategy: replace`:

```sql
SELECT user_id, count(*) AS events, sum(amount) AS spend
FROM enriched
GROUP BY user_id
```

Downstream, a model that reads a Python model's output as an ordinary relation:

```sql
/* interlace:
  materialise: view
*/
SELECT product_id, sum(revenue) AS revenue
FROM by_product
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 20
```

That is the edge other tools cannot express freely. A SQL model selecting `FROM` the output of
a Python model is not a bridge, an adapter or a special case. It is a table reference that
happens to resolve to a model that happens to be Python.

## What makes it work

The [Arrow wire format](/blog/the-ir-is-a-sqlglot-ast). A model boundary is a
`RecordBatchReader` in both directions, so a Python function and a SQL query are
interchangeable at that boundary by construction. There is no conversion step to go wrong and
no DataFrame round-trip to blow up memory.

The handle you receive is single-pass and gives you a choice:

| Call        | Returns                     | Use when                    |
| ----------- | --------------------------- | --------------------------- |
| `.table()`  | `pyarrow.Table`             | eager, whole-table work     |
| `.reader()` | `pyarrow.RecordBatchReader` | streaming, bounded memory   |
| `.schema`   | `pyarrow.Schema`            | inspecting before consuming |

Call one of them, once. A handle consumed twice is an error rather than a silent second scan.

You can return a `pyarrow.Table`, a `RecordBatch`, a `RecordBatchReader`, or — as above — yield
batches from a generator.

## Where the symmetry actually stops

It would be easy to end here, and dishonest. There are three real limits, and they follow from
the design rather than from missing work.

**Python models are always `virtual`.** They cannot be a `view` or `ephemeral`, because both of
those require SQL the engine can evaluate directly — a view is a query, and an ephemeral model
is inlined as a CTE. There is nothing to inline when the model is a Python function.

**Python models cannot deliver to a terminal destination.** `materialise: table` and
`materialise: file` are SQL-only. If you want a Python model's output in an external system,
write a one-line SQL model that selects from it:

```sql
/* interlace:
  materialise: table
  target: crm.main.user_scores
  strategy: merge
  key: user_id
*/
SELECT user_id, ltv FROM user_ltv
```

**Python models cannot use `incremental_by_time`.** Use `cursor` with `merge` instead — the
`cursor` parameter is injected with the maximum value already in the warehouse, which is the
same idea expressed at the level Python can act on.

The first two raise at definition time, the moment the decorator runs. The third is caught
later, when the plan is built — the decorator accepts `incremental_by_time` and the error
arrives on `apply`. That is a wart, not a design: the check belongs next to the other two.

## Testing it

Because the decorator registers the model and returns the function **unchanged**, a Python
model is still an ordinary function. Call it with Arrow tables and assert on what comes back.
No fixtures, no warehouse, no separate framework:

```python
import pyarrow as pa


def test_user_ltv():
    by_user = pa.table({"user_id": [1, 2], "spend": [100.0, 50.0], "events": [3, 1]})
    result = pa.Table.from_batches(user_ltv(FakeHandle(by_user)))
    assert result.column("ltv").to_pylist() == [13.0, 6.0]
```

This is the part that tends to convert people. A pipeline step you can call in a unit test,
with no infrastructure, is a different kind of object from a pipeline step you can only
observe by running it.

The next post is about the other end of the system, where a promise is much harder to keep:
what it takes for an HTTP 200 to actually mean the data is safe.

---

Read the [Python models guide](/docs/guides/python-models) for handles, cursors and the `this`
parameter, or [testing](/docs/guides/testing) for the layered safety net around them.
