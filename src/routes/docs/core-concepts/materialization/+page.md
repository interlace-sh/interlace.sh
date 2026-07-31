---
title: Materialization
---

# Materialization

How Interlace persists model results. Set it with `materialise:` in a SQL header or `materialise=` on `@model`.

## table (default)

The model builds a physical table. Every build writes to an immutable, fingerprint-named snapshot table:

```
interlace__<schema>.<model>__<fingerprint>
```

and each environment exposes it through a view (`main.orders` in prod, `dev__main.orders` in the `dev` sandbox). How the table is *updated* across runs is the model's [strategy](/docs/core-concepts/strategies).

```sql
/* interlace:
  materialise: table
*/
SELECT ...
```

Because snapshots are immutable, a changed model never mutates the table production is reading — it builds a new snapshot, and the view moves only after checks pass. Old snapshots remain (rollback targets) until `interlace gc` reclaims the ones no environment references.

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

Use ephemeral models to name reusable logic without paying for a table or a view. Two constraints: SQL only, and an ephemeral model must be on the same engine as its consumers (there is no table to transfer).

## Sinks (export)

A model with an `export` block is a **sink**: it builds, then delivers its output outside the managed environment — to Parquet/CSV/JSON files or to a table in an attached database. Sinks get no environment view, and by default they only deliver when applying to `prod`. See [SQL models](/docs/guides/sql-models#sinks-export) for the full export reference.

## Summary

| Materialization | Physical table | Environment view | Notes                            |
| --------------- | -------------- | ---------------- | -------------------------------- |
| `table`         | yes (snapshot) | yes              | default; strategies apply        |
| `view`          | no             | yes (a view)     | SQL only                         |
| `ephemeral`     | no             | no               | inlined as CTE; SQL only; same engine as consumers |
| sink (`export`) | yes (snapshot) | no               | delivers to files or external tables |
