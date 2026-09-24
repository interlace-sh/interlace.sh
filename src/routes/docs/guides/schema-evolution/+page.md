---
title: Schema Evolution
description: 'A query change mints a new fingerprint and a new snapshot. Indexes and constraints are applied to the table that already exists. External tables evolve under a schema policy, and are never dropped.'
---

# Schema Evolution

A change to a managed model's query mints a **new fingerprint, a new snapshot table, and a view swap**. Interlace does not `ALTER` that table's columns in place. Indexes and constraints are the exception: they are applied to the table that already exists, and changing them does not rebuild data or invalidate downstream models.

## Contracts

Declare a model's output contract with `columns`:

```sql
/* interlace:
  columns: {order_id: BIGINT, customer_id: BIGINT, amount: DOUBLE}
*/
```

After every build, a missing contracted column or a type mismatch raises a `SchemaError` and **blocks promotion** — the environment view does not move. Extra columns are allowed — contracts pin a floor and leave additive growth free. A column maps to a type, or to `null` to assert presence only (`columns: {order_id: BIGINT, note: null}`).

## How Changes Are Classified

`interlace plan` diffs every model's fingerprint against what the environment has promoted and classifies each change:

| Category       | What it means                                                | Apply behaviour               |
| -------------- | ------------------------------------------------------------ | ----------------------------- |
| `added`        | New model                                                    | builds                        |
| `non_breaking` | Provably additive — new columns only, existing output intact | builds (or reuses, below)     |
| `breaking`     | Existing output may change                                   | **blocked without `--force`** |
| `forward_only` | Breaking, but history is carried forward (below)             | builds on copied history      |
| `metadata`     | Only comments, `owner`, `tags`, or `description` changed     | never rebuilds                |

The analysis is AST-based and conservative: adding `avg(amount) AS avg_amount` to a `SELECT` is additive; anything that touches existing expressions — or that the analyser can't prove safe (`SELECT *` rewrites, `DISTINCT`, positional `GROUP BY`, ...) — is treated as breaking.

## The Gate

```bash
interlace apply
# plan has breaking changes (orders); re-run with --force to proceed
```

A plan containing breaking changes stops with exit code 1 (the HTTP API returns 400 the same way). `--force` acknowledges the blast radius and proceeds — downstream models rebuild too.

## Column-Level Blast Radius

Because the differ works on ASTs, it tracks **which columns** changed and which columns each downstream reads. A downstream model whose inputs are provably untouched is _reused_: its existing table is kept, no rebuild, just a re-recorded snapshot.

```
orders: amount definition changed        -> rebuild
orders_by_day (reads amount)             -> rebuild
customer_names (reads customer_id only)  -> reuse
```

Additive upstream changes only rebuild downstreams that `SELECT *` from them. Ambiguity always errs toward rebuilding — never toward a false skip. The lineage view in the web UI traces the same column graph interactively.

## Forward-Only Changes

History-keeping strategies (`merge`, `full_merge`, `scd`, `incremental`) accumulate state a from-scratch rebuild would destroy. `--forward-only` changes the contract:

```bash
interlace apply --forward-only
```

For each modified history-keeping model, the existing table is **copied to the new snapshot** (copy-on-write), the new logic applies from now on, and the interval ledger carries over. Checks still gate before views move, and the old snapshot remains untouched as the rollback target until `interlace gc`. History can't be copied across engines — a `--forward-only` model whose engine was re-pinned falls back to a from-scratch rebuild.

## Rollback

Old snapshots are the rollback story: views can move back to them because the table's rows were not altered in place. Unreferenced snapshots are reclaimed by `interlace gc` after a grace period (default 7 days) — until then, every promotion is reversible. An index added later lives on the current snapshot; rolling the view back does not drop it from the new table, and `gc` drops the table (and its indexes) together.

## Indexes and Constraints

Declare them on a `virtual` or `table` model. They are a separate physical hash, so `plan` shows `+ index il__orders__id` / `- constraint il__orders__pk` instead of a rebuild. Apply creates missing objects and drops only names it recorded. The full declaration, naming, and per-engine enforcement are on the [models page](/docs/core-concepts/models#indexes-and-constraints).

## External Tables

A `materialise: table` target is shared, so column drift has a policy and no drop mode:

| `schema.columns` | Behaviour                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `additive`       | Default. Add a missing column, widen a numeric type, cast other drift, leave extra columns in place      |
| `reject`         | Fail the plan before any write if the live table is not a compatible superset. A widen is still allowed   |
| `ignore`         | No `ALTER`. Delivery fails at the engine if the insert does not fit                                      |

`schema.indexes` and `schema.constraints` are `manage` (reconcile names Interlace created) or `ignore`. An index the destination already had is reported in `plan` and left alone. `force` does not bypass a blocking `reject`.

## Streams: Drift at the Edge

Managed tables never see surprise schemas, but events arriving over HTTP do. Streams handle drift at ingestion with `on_schema_drift`:

- **`reject`** (default) — non-conforming requests fail with 400
- **`evolve`** — new fields become new columns on the stream table; incompatible changes to declared fields still fail
- **`quarantine`** — bad rows divert to `streams.<name>__quarantine` for inspection and replay

See [streaming](/docs/guides/streaming#schema-drift) for details.

## Next Steps

- [Quality checks](/docs/guides/quality-checks) — the other half of the gate
- [Strategies](/docs/core-concepts/strategies) — which strategies keep history
