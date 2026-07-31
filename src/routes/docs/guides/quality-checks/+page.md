---
title: Quality Checks
---

# Quality Checks

Checks are data-quality assertions attached to models. They run against every freshly built table during `apply`/`run`/`restate`, and a failing `error`-severity check **blocks promotion** — no views move, the environment stays as it was.

## Declaring Checks

On a SQL model:

```sql
/* interlace:
  checks:
    - not_null: order_id
    - unique: [order_id]
    - accepted_values: {column: status, values: [open, shipped, closed]}
    - expression: {expression: "amount >= 0", severity: warn}
*/
SELECT ...
```

On a Python model: `@model(checks=[{"not_null": "id"}, ...])`.

Two syntaxes per entry:

- **shorthand** — one key, the type: `- not_null: order_id`, `- unique: [a, b]`, `- row_count: {min: 1}`
- **explicit** — `- {type: not_null, column: order_id, severity: warn}` (use `column` or `columns`; remaining keys are the check's parameters)

## Built-in Check Types

| Type              | Parameters             | Fails when                                                |
| ----------------- | ---------------------- | --------------------------------------------------------- |
| `not_null`        | column(s)              | any listed column is NULL                                 |
| `unique`          | column(s)              | duplicate values (composite keys supported)               |
| `accepted_values` | column, `values`       | a non-NULL value is outside the list                      |
| `range`           | column, `min`/`max`    | a non-NULL value is out of bounds                         |
| `pattern`         | column, `regex`        | a non-NULL value doesn't match                            |
| `expression`      | `expression`           | any row violates the SQL predicate                        |
| `relationships`   | column, `to`, `field`  | a non-NULL value has no match in model `to`'s `field`     |
| `row_count`       | `min` and/or `max`     | the row count is out of bounds                            |
| `freshness`       | column, `max_age`      | `max(column)` is older than `max_age` (`2h`, `1d`, ...) — or the table is empty |
| `sql`             | `query`                | the query returns rows; `{table}` is substituted with the model's table |

`pattern`, `range`, `accepted_values`, and `relationships` deliberately **ignore NULLs** — `not_null` is the null check; combine them when NULLs should also fail.

## Severity

Every check takes `severity: error | warn | info` (default `error`). Only `error` blocks — `warn` and `info` outcomes are recorded and reported, and the pipeline continues.

## Python Checks

For assertions SQL can't express, decorate a function with `@check`. It receives the built table as a `RelationHandle`:

```python
from interlace import check

@check(model="event_totals", severity="error")
def totals_are_positive(rel):
    t = rel.table()
    return all(v > 0 for v in t.column("total_amount").to_pylist())
```

Return `True`, `None`, or `0` to pass; `False`, a failure count, or a `pyarrow.Table` of failing rows to fail. Put `@check` functions anywhere under your model paths.

## When Checks Run

1. **During builds** — after a model materialises (and its [column contract](/docs/core-concepts/models#column-contracts) validates), its checks run against the fresh snapshot. Any blocking failure aborts the apply before promotion.
2. **On demand** — against an environment's already-promoted tables, no rebuild:

```bash
interlace checks run --env prod         # exits 1 on any error-severity failure
interlace checks run -s orders+ --json
```

Or `POST /checks/run` on the [HTTP API](/docs/reference/api).

All outcomes are recorded, whichever path ran them:

```bash
interlace checks list --model orders    # newest first
```

`GET /checks` and the web UI's checks view read the same history.

## Checks and Rebuilds

Check declarations are metadata: **editing a check never rebuilds a model**. Add assertions to a large table freely — then verify them immediately with `interlace checks run`.

## Next Steps

- [Testing](/docs/guides/testing) — checks in a CI workflow
- [Schema evolution](/docs/guides/schema-evolution) — contracts and change gating
