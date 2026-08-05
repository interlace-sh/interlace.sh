---
title: 'Two Planes: What materialise Means in 2.0'
date: '2026-08-06'
author: Interlace Team
excerpt: Interlace 2.0 makes materialise the ownership axis and deletes the export block. One key changed meaning, which is why this is a major version. The reasoning, and the migration.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Two Planes: What materialise Means in 2.0" date="2026-08-06" />

Interlace 2.0 is the first release that breaks something. It reframes `materialise` and removes
the `export:` block, and it does so because the two concepts were the same concept wearing
different names.

If you are upgrading, the migration is at the bottom and it is short. The reasoning is worth
reading first, because one existing key changed meaning rather than disappearing — and a key
that changes meaning is more dangerous than one that is deleted.

## The problem with `export:`

Before 2.0, a model had a `materialise` — `table`, `view` or `ephemeral` — and, optionally, an
`export:` block that delivered its result somewhere external:

```sql
/* interlace: {export: {to: table, target: crm.public.accounts, mode: merge_by_key, key: id}} */
```

That worked, and it accumulated three problems.

**It had its own vocabulary.** `mode:` did the same job as `strategy:` and could not use the
same values. Two names for one idea.

**It could not do everything a strategy could.** `export:` supported replace and keyed merge.
It had no windowed delivery, so `incremental_by_time` into an external table was simply not
expressible — despite that being one of the most useful things you can do with reverse ETL.

**It was bolted to the side.** A model had a destination _and_ an export. Two places to look,
and an unclear answer to what a model with both actually was.

## The reframe

2.0 collapses them. **`materialise` is the destination and ownership plane; `strategy` is how
the result is written.** The two compose freely.

There are two planes:

**Owned** — `virtual`, `view`, `ephemeral`. Interlace owns the target. It builds an immutable,
fingerprint-named snapshot and serves it through an environment view. This is the plane that
makes [rebuild-skip, sandboxes, view-swap promotion, rollback and
gc](/blog/sandboxes-that-cost-nothing) possible, because all of those depend on interlace being
free to build a new table beside the live one and repoint a view.

**Terminal** — `table`, `file`. A destination interlace does _not_ own. It delivers into an
external table or overwrites a file. No snapshot, no environment view, environment-gated by
default, and the destination is evolved additively but never dropped.

| `materialise`       | Plane    | Produces                                  | Strategies                                                            |
| ------------------- | -------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `virtual` (default) | owned    | snapshot table behind an environment view | `replace` · `merge` · `full_merge` · `incremental_by_time` · `scd`    |
| `view`              | owned    | `CREATE OR REPLACE VIEW`                  | —                                                                     |
| `ephemeral`         | owned    | nothing — inlined as a CTE                | —                                                                     |
| `table`             | terminal | rows delivered into an external `target`  | `replace` · `append` · `merge` · `full_merge` · `incremental_by_time` |
| `file`              | terminal | a file at `path` (parquet · csv · json)   | overwrite                                                             |

The strategies are genuinely the same strategies. `merge` on a `virtual` model and `merge` on
an external `table` are one implementation pointed at two destinations.

## Why the planes cannot be merged

It is reasonable to ask why a terminal table does not get the snapshot machinery too. The
answer is the sharpest thing in the design:

The snapshot-and-view layer works **only because interlace owns its tables**. It shadow-builds
`model__<fingerprint>` beside the live one and atomically repoints a view. A terminal target
conflates the build target with the read target — there is no old version to serve during the
build and no atomic cutover.

So a breaking change cannot apply to a `table`. There is nowhere to put the new version while
the old one is still being read. Terminal destinations therefore evolve additively only: new
columns, widened types, NULL-fill, and never a drop.

That constraint is also a feature. Because interlace never drops the target, grants, indexes,
row-level security policies and downstream readers all survive a delivery. This is the same
split Census and Hightouch make between "the model in the warehouse" and "the sync to the
destination" — 2.0 just puts both on one axis instead of two.

It shows up in `replace`, which is the only strategy that differs across the planes. On the
owned plane it is a `CREATE OR REPLACE`. On the terminal plane it empties and re-fills the live
table in place, so the table object itself is never destroyed.

## What 2.0 gained

Collapsing the concepts was not only tidier — it made two things possible that were not before.

**`incremental_by_time` into an external table.** Windowed delete-and-insert against a live
external target, tracked in the same interval ledger as any owned incremental model. `export:`
could not express this at all.

**`append`.** A new strategy, external-only, for a growing log in a destination system.

And one thing became safer. A bare `materialise: table` — which used to be the _default,
interlace-owned_ materialisation — now fails loudly:

```
materialise: table needs a target: (<alias>.<schema>.<table>); did you mean materialise: virtual?
```

That error exists precisely because this is the dangerous edge of the release. Without it, an
un-migrated model would have quietly stopped being an owned snapshot and started trying to
deliver somewhere external.

## Migration

Three rules cover everything.

**Owned models.** `materialise: table` becomes `materialise: virtual` — or delete the line,
since `virtual` is now the default.

```diff
  /* interlace:
-   materialise: table
    strategy: merge
    key: order_id
  */
```

**Table exports.**

```diff
- /* interlace: {export: {to: table, target: crm.public.accounts, mode: merge_by_key, key: id}} */
+ /* interlace:
+   materialise: table
+   target: crm.public.accounts
+   strategy: merge
+   key: id
+ */
```

**File exports.**

```diff
- /* interlace: {export: {to: parquet, path: out/daily.parquet}} */
+ /* interlace:
+   materialise: file
+   format: parquet
+   path: out/daily.parquet
+ */
```

A leftover `export:` key in a SQL header, or an `export=` keyword on `@model`, raises a
migration error naming its replacement rather than being ignored.

One rename in the API: the `ModelInfo` and `ModelDetail` field `is_sink` is now `is_terminal`.

## Where the series lands

Six posts ago this was a 0.x codebase with an
[Ibis veneer and an in-memory stream queue](/blog/what-we-got-wrong). The rebuild bet on
[a sqlglot AST and an Arrow wire format](/blog/the-ir-is-a-sqlglot-ast), which made
[free sandboxes](/blog/sandboxes-that-cost-nothing) and
[Python models that are ordinary functions](/blog/a-python-model-is-just-a-function) fall out
as consequences rather than features. [Durable ingestion](/blog/200-ok-means-fsynced) closed
the loop at the front.

2.0 is the tidying-up: one axis for where a result goes, one for how it gets written, and
nothing bolted to the side.

---

Read [materialization](/docs/core-concepts/materialization) for the full model, or
[SQL models](/docs/guides/sql-models#terminal-outputs-external-tables-and-files) for terminal
outputs and environment gating.

```bash
uv pip install "interlaced[service]"
```
