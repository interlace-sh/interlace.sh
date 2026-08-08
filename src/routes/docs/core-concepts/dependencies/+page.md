---
title: Dependencies
description: 'How Interlace resolves model dependencies: sqlglot parses every SQL model into an AST and reads its FROM and JOIN references to build the DAG.'
---

# Dependencies

How Interlace resolves relationships between models.

## Inference from SQL

Interlace parses every SQL model into an AST (via sqlglot) and reads its table references — every `FROM` and `JOIN`:

```sql
-- models/order_summary.sql
SELECT o.customer_id, count(*) AS orders, sum(o.amount) AS revenue
FROM orders o
JOIN customers c ON o.customer_id = c.id
GROUP BY o.customer_id
```

`order_summary` depends on `orders` and `customers` — no configuration needed. The resolution rules:

- A reference matches a model by **exact name** (`silver.orders`) or by its **last segment** (`main.orders` and plain `orders` both match the model `orders`)
- CTE names defined in the query are excluded
- References that match no model are left alone — that's how you read attached databases (`crm.main.customers`) and stream tables (`streams.orders`)

At build time each matched reference is rewritten to the upstream's physical snapshot table, so your SQL always reads the exact fingerprinted version the plan resolved.

## Explicit Dependencies

Add dependencies the parser can't see with `depends_on`:

```sql
/* interlace:
  depends_on: [seed_calendar]
*/
SELECT ...
```

Explicit entries come first, then inferred ones, deduplicated in order.

## Python Models

Python models have no SQL to scan, so dependencies come **only** from `depends_on`. Each dependency you name as a function parameter is passed in as a `RelationHandle`:

```python
@model(depends_on=["raw.accounts", "raw.events"])
def account_activity(raw_accounts, raw_events):
    ...
```

Parameters match dependency names exactly, or with dots replaced by underscores (`raw.accounts` → `raw_accounts`). A parameter that matches no declared dependency (and isn't the reserved `cursor` or `this`) is a definition error. A declared dependency you don't name as a parameter still orders the build — it just isn't passed.

## Selectors

Most commands accept `--select` / `-s` to target part of the graph:

| Selector         | Meaning                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `orders`         | just `orders`                                                                                      |
| `+orders`        | `orders` and all its ancestors                                                                     |
| `orders+`        | `orders` and all descendants                                                                       |
| `+orders+`       | both                                                                                               |
| `tag:daily`      | every model tagged `daily`                                                                         |
| `state:modified` | every model whose fingerprint differs from what the target environment promoted (added or changed) |

The `+`/`+…+` affixes also apply to `state:modified` — `state:modified+` selects the changed models and everything downstream of them. Selectors are repeatable and comma- or whitespace-separated: `interlace apply -s "+order_summary" -s tag:finance`. When you select a subset, changed ancestors are pulled in automatically so nothing builds against a stale upstream.

## Special Cases

- **Ephemeral upstreams** are never materialised — their query is inlined into each consumer as a CTE
- **Cross-engine upstreams** are staged onto the consumer's engine automatically ([multi-engine guide](/docs/guides/multi-backend))
- **Stream tables** (`streams.<name>`) wire streams to consumers: when the daemon flushes new events, models reading the stream (and their descendants) are enqueued as a run
- **Cycles** are rejected at compile time

## Next Steps

- [Materialization](/docs/core-concepts/materialization) — how results are persisted
- [Multi-engine](/docs/guides/multi-backend) — pinning models to engines
