---
title: Schema Evolution
description: 'Interlace never mutates a managed table in place. A change mints a new fingerprint, a new snapshot table and a view swap, with the breaking ones gated behind a flag.'
---

# Schema Evolution

Interlace never mutates a managed table's schema in place. A model change produces a **new fingerprint, a new snapshot table, and a view swap** — so evolution is about classifying changes, gating the dangerous ones, and carrying history forward when a rebuild would destroy it.

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

Old snapshots are the rollback story: views can move back to them because nothing was altered in place. Unreferenced snapshots are reclaimed by `interlace gc` after a grace period (default 7 days) — until then, every promotion is reversible.

## Streams: Drift at the Edge

Managed tables never see surprise schemas, but events arriving over HTTP do. Streams handle drift at ingestion with `on_schema_drift`:

- **`reject`** (default) — non-conforming requests fail with 400
- **`evolve`** — new fields become new columns on the stream table; incompatible changes to declared fields still fail
- **`quarantine`** — bad rows divert to `streams.<name>__quarantine` for inspection and replay

See [streaming](/docs/guides/streaming#schema-drift) for details.

## Next Steps

- [Quality checks](/docs/guides/quality-checks) — the other half of the gate
- [Strategies](/docs/core-concepts/strategies) — which strategies keep history
