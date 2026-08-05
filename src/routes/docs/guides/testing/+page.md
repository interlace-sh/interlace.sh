---
title: Testing
---

# Testing Pipelines

Interlace's safety net is layered: preview before you run, assert on what you built, rehearse in a sandbox, and unit-test Python logic as plain functions.

## Preview: plan Never Runs Anything

`interlace plan` compiles the project, fingerprints every model, and classifies every change — without touching the warehouse:

```bash
interlace plan
interlace plan --json        # for CI
```

A plan with **breaking** changes makes `interlace apply` exit non-zero unless `--force` is passed, so the classification itself is an automated review gate. See [schema evolution](/docs/guides/schema-evolution) for what counts as breaking.

## Assert: Checks Gate Every Promotion

[Quality checks](/docs/guides/quality-checks) are the assertion layer — the full catalogue of ten built-in types lives in that guide. They run against the freshly built tables during every `apply`/`run`, and a failing `error`-severity check blocks promotion — production views never move onto bad data:

```sql
/* interlace:
  checks:
    - not_null: order_id
    - unique: order_id
    - relationships: {column: customer_id, to: customers, field: id}
    - expression: {expression: "amount >= 0"}
*/
```

Every result is recorded in the state store, so checks double as an ops surface:

```bash
interlace checks run --env dev      # re-run against promoted tables, no rebuild; exits 1 on error-severity failure
interlace checks list --model orders --limit 20   # recent recorded results, newest first
```

`checks run` uses each snapshot's recorded engine and skips sinks and declared-but-not-promoted models. The same data is at `GET /checks`, `POST /checks/run`, and the UI's Checks view.

Custom assertions are Python functions — return `True`/`0`/an empty table to pass, or a failure count / non-empty table of offending rows to fail:

```python
from interlace import check

@check(model="event_totals")
def totals_are_positive(rel):
    t = rel.table()
    return all(v > 0 for v in t.column("total_amount").to_pylist())
```

## Rehearse: Sandbox Environments

An [environment](/docs/guides/environments) is a full-fidelity staging area in the same warehouse:

```bash
interlace apply --env ci-1234    # build + check the whole graph, isolated views
interlace checks run --env ci-1234
interlace env drop ci-1234
```

Unchanged models are **reused**, not rebuilt, so a sandbox apply after a small edit only pays for what changed and its (non-pruned) downstream.

## Unit-Test Python Models

`@model` returns your function unchanged, so model logic is directly importable and testable — feed it Arrow data through a minimal handle stub:

```python
import pyarrow as pa
from models.user_ltv import user_ltv

class FakeHandle:
    def __init__(self, table: pa.Table):
        self._t = table
    def table(self) -> pa.Table:
        return self._t
    def reader(self) -> pa.RecordBatchReader:
        return pa.RecordBatchReader.from_batches(self._t.schema, self._t.to_batches())

def test_user_ltv():
    users = pa.table({"user_id": [1, 2], "spend": [100.0, 40.0], "events": [3, 1]})
    out = pa.Table.from_batches(list(user_ltv(FakeHandle(users))))
    assert out.column("ltv").to_pylist() == [13.0, 5.0]
```

Reserved parameters are just arguments in a test: pass `cursor=None` to exercise the first-run path, or a `FakeHandle` as `this`.

## A CI Recipe

```bash
interlace plan --json > plan.json          # fail the job on unexpected breaking changes
interlace apply --env "ci-${BUILD_ID}"     # build + contract validation + checks
interlace checks run --env "ci-${BUILD_ID}" --json
interlace env drop "ci-${BUILD_ID}"
```

Every command exits non-zero on failure, and `--json` output is stable for scripting. Merged to main? The deploy job is simply `interlace apply`.

## Next Steps

- [Quality checks](/docs/guides/quality-checks) — all ten check types
- [Environments](/docs/guides/environments) — sandbox lifecycle
