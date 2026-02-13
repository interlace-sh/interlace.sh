---
title: SQL Models
---

# SQL Models

Write models in pure SQL. Interlace automatically detects dependencies from your table references.

## Basic SQL Model

Create a `.sql` file in your models directory:

```sql
-- models/active_users.sql
SELECT *
FROM users
WHERE status = 'active'
```

## Referencing Other Models

Interlace parses your SQL and automatically detects dependencies from `FROM` and `JOIN` clauses:

```sql
SELECT
    o.id,
    o.amount,
    c.name AS customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
```

Dependencies are extracted automatically—no special syntax required. Simply reference other models by their table name.

## Model Configuration

Add configuration in a YAML block comment:

```sql
-- models/daily_metrics.sql
/*
interlace:
  materialize: table
  strategy: replace
*/

SELECT
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS order_count,
    SUM(amount) AS total_amount
FROM orders
GROUP BY 1
```

### Available Configuration Options

| Option        | Description                                   |
| ------------- | --------------------------------------------- |
| `materialize` | `table`, `view`, or `ephemeral`               |
| `strategy`    | `replace`, `append`, `merge_by_key`           |
| `schema`      | Target schema name                            |
| `connection`  | Connection to use (if different from default) |

## When to Use SQL

SQL models are ideal for:

- Complex queries that are hard to express in Python/ibis
- Porting existing dbt or SQLMesh models
- Team members more comfortable with SQL
- Database-specific optimizations and functions
- Simple transformations that don't need Python logic

## Mixing Python and SQL

You can freely mix Python and SQL models in the same project. A SQL model can depend on a Python model and vice versa:

```python
# models/enriched.py
@model(name="enriched_orders", materialize="table")
def enriched_orders(daily_metrics: ibis.Table, customers: ibis.Table) -> ibis.Table:
    # daily_metrics comes from a SQL model
    return daily_metrics.join(customers, ...)
```
