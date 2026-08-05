---
title: Materialization
---

# Materialization

`materialise` is the **destination and ownership plane** for a model's result — set it with
`materialise:` in a SQL header or `materialise=` on `@model`. It answers *where the data lands
and who owns it*; the [strategy](/docs/core-concepts/strategies) answers *how it is written*.
The two compose.

There are two planes:

- **Owned (virtual / view / ephemeral)** — interlace owns the target. It builds an immutable,
  fingerprint-named snapshot and exposes it through an environment view. This is what makes
  rebuild-skip, sandboxed environments, atomic promotion, rollback, and gc possible.
- **Terminal (table / file)** — a destination interlace does **not** own. It delivers into an
  external table or overwrites a file, produces no environment view, is environment-gated, and
  evolves the destination additively but never drops it.

## virtual (default)

The model builds a physical table interlace owns. Every build writes to an immutable,
fingerprint-named snapshot:

```
interlace__<schema>.<model>__<fingerprint>
```

and each environment exposes it through a view (`main.orders` in prod, `dev__main.orders` in the
`dev` sandbox). How the table is _updated_ across runs is the model's
[strategy](/docs/core-concepts/strategies).

```sql
/* interlace:
  materialise: virtual
*/
SELECT ...
```

Because snapshots are immutable, a changed model never mutates the table production is reading —
it builds a new snapshot, and the view moves only after checks pass. Old snapshots remain
(rollback targets) until `interlace gc` reclaims the ones no environment references.

> **Renamed in 2.0.** The owned-snapshot plane used to be called `table`. It is now `virtual`
> (and it is still the default). `table` now means an *external* table — see below.

## view

The model becomes a view — no data is copied, the query runs at read time:

```sql
/* interlace:
  materialise: view
*/
SELECT * FROM orders WHERE status = 'open'
```

Views ignore `strategy`. SQL only.

## ephemeral

The model is never built at all — its query is inlined into every consumer as a CTE:

```sql
/* interlace:
  materialise: ephemeral
*/
SELECT order_id, amount * 1.2 AS amount_gross FROM orders
```

Use ephemeral models to name reusable logic without paying for a table or a view. Two
constraints: SQL only, and an ephemeral model must be on the same engine as its consumers (there
is no table to transfer).

## table (external reverse ETL)

The model delivers its result into an **external table interlace does not own**, named
`<alias>.<schema>.<table>` where `alias` is a database wired in with the project's
[`attach:`](/docs/reference/configuration) config (Postgres, SQLite, another DuckDB):

```sql
/* interlace:
  materialise: table
  target: crm.main.customer_scores
  strategy: merge_by_key
  key: customer_id
*/
SELECT customer_id, name, score FROM customer_value
```

The `strategy` picks the delivery — the **same strategies as a virtual model**, pointed at the
external table: `full` (DELETE all + INSERT in place), `append`, `merge_by_key`, `full_merge`,
and `incremental_by_time` (windowed delete + insert). interlace only ever creates, appends to, or
**additively evolves** the target (new columns via `ALTER … ADD COLUMN`, widening, NULL-fill);
it **never drops it**, so grants, indexes, RLS and downstream readers survive.

A `table` model **can carry [checks](/docs/guides/quality-checks)** — they run against the
delivered external table and gate promotion (and, being environment-gated, are skipped in a
sandbox where nothing was delivered). A `file` has no queryable relation, so it can't.

A terminal model is **not readable by other models** — it's an environment-gated side effect into
a table interlace doesn't own, so a downstream that depended on it would read across environments
(a dev build seeing prod's external table). Depend on the source model instead, or reference the
external table directly by name if you truly need it.

## file

The model overwrites a file with its result via DuckDB `COPY`:

```sql
/* interlace:
  materialise: file
  format: parquet          # parquet | csv | json
  path: exports/orders.parquet
*/
SELECT * FROM orders
```

## Environment gating (terminal only)

`table` and `file` are side-effecting, so they are **environment-gated**: a model only *delivers*
when the plan's environment is in its `environments` list — default `[prod]`, so a `dev` apply
never fires reverse-ETL at a live destination. Widen it explicitly:

```sql
/* interlace: { materialise: table, target: crm.main.scores, environments: [dev, prod] } */
```

In a gated-off environment the model's fingerprint is still recorded so the plan settles —
nothing leaves the warehouse.

## Breaking changes vs. terminals

Only the **owned** plane supports breaking changes safely: a breaking edit mints a new snapshot
beside the live one and swaps atomically, and can be rolled back. A `table`/`file` target has no
old version to serve during a rebuild and no atomic cutover, so a terminal model evolves its
destination **additively only** and re-delivers on change — it never applies a destructive
rewrite to a table interlace doesn't own.

## Summary

| `materialise` | Plane | Physical | Env view | Strategies | Notes |
| --- | --- | --- | --- | --- | --- |
| `virtual` | owned | snapshot table | yes | full · merge_by_key · full_merge · incremental_by_time · scd_type_2 | default |
| `view` | owned | a view | yes | — | SQL only |
| `ephemeral` | owned | none (CTE) | no | — | SQL only; same engine as consumers |
| `table` | terminal | external table (`target`) | no | full(=replace) · append · merge_by_key · full_merge · incremental_by_time | env-gated; never dropped |
| `file` | terminal | a file (`path`+`format`) | no | overwrite | env-gated; parquet · csv · json |
