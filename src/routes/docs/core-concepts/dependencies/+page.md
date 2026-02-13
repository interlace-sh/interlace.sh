---
title: Dependencies
---

# Dependencies

How Interlace resolves relationships between models.

## Automatic Dependency Detection

Interlace automatically detects dependencies based on function parameters:

```python
@model(name="orders", materialize="table")
def orders() -> ibis.Table:
    return load_orders()

@model(name="order_totals", materialize="table")
def order_totals(orders: ibis.Table) -> ibis.Table:
    # 'orders' parameter creates a dependency on the orders model
    return orders.group_by(orders.customer_id).agg(
        total=orders.amount.sum()
    )
```

The `orders` parameter name matches the model name, so Interlace automatically passes the orders table as input.

## SQL Dependencies

In SQL models, Interlace parses your queries and detects dependencies from table references:

```sql
SELECT *
FROM orders
WHERE amount > 100
```

Interlace analyzes `FROM` and `JOIN` clauses to build the dependency graph and ensure proper execution order.

## Dependency Graph

Interlace builds a Directed Acyclic Graph (DAG) of all models:

```
raw_users ──┬──► active_users ──► user_summary
            │
raw_orders ─┴──► enriched_orders
```

## Execution Order

Models are executed in topological order:

1. Models with no dependencies run first
2. Downstream models wait for their dependencies
3. Independent models run in parallel

## Selective Execution

Run specific models and their dependencies:

```bash
# Run only user_summary and its upstream dependencies
interlace run --task user_summary

# Run everything downstream of raw_users
interlace run --task raw_users --downstream
```
