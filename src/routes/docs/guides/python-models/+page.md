---
title: Python Models
---

# Python Models

A complete guide to writing Python models. Python models are ordinary functions decorated with `@model`; data crosses the boundary as Apache Arrow — never as pandas — so large tables stream with bounded memory.

## Basics

```python
from interlace import model
import pyarrow as pa

@model(depends_on=["raw_users"])
def active_users(raw_users) -> pa.Table:
    users = raw_users.table()
    return users.filter(pa.compute.equal(users["status"], "active"))
```

- Dependencies are declared with `depends_on` (there is no SQL to infer from)
- Each dependency named as a parameter arrives as a **`RelationHandle`** — call `.table()` for an eager `pyarrow.Table` _or_ `.reader()` for a streaming `RecordBatchReader`. A handle is **single-pass**: read it once, one way; a second read raises
- Return a `pyarrow.Table`, `RecordBatch`, `RecordBatchReader`, or an iterable of `RecordBatch`es (generators stream with bounded memory)
- `async def` works too; sync functions run in a worker thread

## Streaming Transformations

Generators process arbitrarily large inputs batch by batch:

```python
import pyarrow as pa
import pyarrow.compute as pc

@model(depends_on=["by_user"], strategy="merge", key=["user_id"])
def user_ltv(by_user):
    for batch in by_user.reader():
        score = pc.add(pc.multiply(batch.column("spend"), 0.1), batch.column("events"))
        yield pa.RecordBatch.from_arrays(
            [batch.column("user_id"), batch.column("spend"), pc.round(score, 2)],
            names=["user_id", "spend", "ltv"],
        )
```

## Incremental Extraction with `cursor`

`cursor` is a reserved parameter: declare a cursor column on the decorator, and Interlace injects the column's max value from the previous build (`None` on the first run):

```python
@model(strategy="merge", key="id", cursor="updated_at")
def events(cursor):
    # First run: cursor is None -> full extract.
    # Later runs: only fetch what's new.
    return fetch_rows(since=cursor)
```

The cursor column must exist in the model's own output. The value is read straight from the warehouse (the max of that column in the previous materialisation), not from a side ledger — so it can't drift from committed data. A crash before commit just re-extracts the overlap, and a keyed strategy makes the re-load idempotent. This is the Python answer to `incremental_by_time` (which is SQL-only): the source is asked only for new rows, and `merge` folds them in.

## Self-Reference with `this`

`this` is the other reserved parameter — a `RelationHandle` over the model's previous materialisation (`None` on the first run). Use it for anti-joins and "what changed" logic:

```python
@model(strategy="merge", key="id", depends_on=["staged"])
def deduped(staged, this):
    new = staged.table()
    if this is None:
        return new
    seen = this.table().column("id")
    mask = pa.compute.invert(pa.compute.is_in(new["id"], value_set=seen))
    return new.filter(mask)
```

## Working with pandas or Polars

Convert at the edges — the model boundary itself stays Arrow:

```python
@model(depends_on=["orders"])
def summary(orders):
    df = orders.table().to_pandas()        # or polars.from_arrow(...)
    out = df.groupby("region").amount.sum().reset_index()
    return pa.Table.from_pandas(out)
```

## Naming and Parameters

- The model name defaults to the function name; pass `@model("silver.users")` to set name and schema
- Parameters match dependency names exactly or with dots as underscores (`raw.events` → `raw_events`)
- A parameter that isn't a declared dependency (or `cursor`/`this`) raises a definition error at build time

## Restrictions

- Python models are always `virtual` (an owned snapshot) — `view` and `ephemeral` are SQL-only, and the terminal `table`/`file` planes need a SQL model (write one over the Python model's output)
- No `incremental_by_time` — use `cursor` + `merge`

## Change Detection

A Python model's fingerprint hashes the **function source**: edit the body and the model rebuilds; edit a helper in another module and it won't. Keep meaningful logic in (or flowing through) the decorated function, or bump it deliberately when a helper changes.

## Next Steps

- [Models](/docs/core-concepts/models) — full decorator reference
- [Dynamic models](/docs/guides/dynamic-models) — a `@model` factory to generate many models
- [Testing](/docs/guides/testing) — unit-testing model functions
- [Quality checks](/docs/guides/quality-checks) — `@check` for custom Python assertions
