---
title: Models
---

# Models

Models are the fundamental building blocks of Interlace pipelines.

## What is a Model?

A model is a transformation that takes zero or more input tables and produces an output table. Models are defined using the `@model` decorator.

## Python Models

```python
from interlace import model
import ibis

@model(name="enriched_orders", materialize="table")
def enriched_orders(
    orders: ibis.Table,
    customers: ibis.Table
) -> ibis.Table:
    return orders.join(
        customers,
        orders.customer_id == customers.id
    ).select(
        orders.id,
        orders.amount,
        customers.name.name("customer_name")
    )
```

## SQL Models

You can also define models in SQL files. Create `models/enriched_orders.sql`:

```sql
-- models/enriched_orders.sql
SELECT
    o.id,
    o.amount,
    c.name AS customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
```

Interlace automatically detects dependencies by parsing table references in your SQL.

## Model Options

| Option        | Description                                          | Default   |
| ------------- | ---------------------------------------------------- | --------- |
| `name`        | Unique identifier for the model                      | Required  |
| `materialize` | How to persist: `table`, `view`, `ephemeral`         | `table`   |
| `strategy`    | Update strategy: `replace`, `append`, `merge_by_key` | `replace` |
| `primary_key` | Key columns for merge strategies                     | None      |
| `tags`        | Labels for filtering and organization                | `[]`      |

## Best Practices

1. **Keep models focused** - Each model should do one thing well
2. **Use meaningful names** - Model names become table names
3. **Prefer ibis operations** - They compile to efficient SQL
4. **Avoid `.execute()`** - Let Interlace handle execution
