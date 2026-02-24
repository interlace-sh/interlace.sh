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

@model(name="enriched_orders", materialise="table")
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

### Core

| Option         | Type                      | Default         | Description                                              |
| -------------- | ------------------------- | --------------- | -------------------------------------------------------- |
| `name`         | `str`                     | function name   | Unique identifier for the model                          |
| `schema`       | `str`                     | `"public"`      | Database schema/database name                            |
| `connection`   | `str`                     | `None`          | Named connection from config (defaults to first)         |
| `materialise`  | `str`                     | `"table"`       | How to persist: `table`, `view`, `ephemeral`, `none`     |
| `strategy`     | `str`                     | `None`          | Update strategy: `replace`, `append`, `merge_by_key`, `scd_type_2`, `none` |
| `primary_key`  | `str \| list[str]`        | `None`          | Key column(s) for merge/SCD strategies                   |
| `dependencies` | `list[str]`               | `None`          | Explicit dependencies (auto-detected if omitted)         |

### Metadata

| Option        | Type         | Default | Description                          |
| ------------- | ------------ | ------- | ------------------------------------ |
| `tags`        | `list[str]`  | `None`  | Labels for filtering, e.g. `["source"]` |
| `description` | `str`        | `None`  | Human-readable description           |
| `owner`       | `str`        | `None`  | Owner or team identifier             |

### Schema & Columns

| Option           | Type   | Default  | Description                                               |
| ---------------- | ------ | -------- | --------------------------------------------------------- |
| `fields`         | `dict` | `None`   | Schema definition: `{"col": "type"}`                      |
| `strict`         | `bool` | `False`  | If `True`, drop columns not listed in `fields`            |
| `column_mapping` | `dict` | `None`   | Rename columns: `{"old_name": "new_name"}`                |
| `schema_mode`    | `str`  | `"safe"` | Evolution mode: `strict`, `safe`, `flexible`, `lenient`, `ignore` |

### Reliability & Performance

| Option         | Type          | Default | Description                                                      |
| -------------- | ------------- | ------- | ---------------------------------------------------------------- |
| `cache`        | `dict`        | `None`  | Cache policy: `{"ttl": "7d", "strategy": "ttl"}`                |
| `retry_policy` | `RetryPolicy` | `None`  | Retry config for transient failures                              |
| `cursor`       | `str`         | `None`  | Cursor column for incremental processing                         |

### Scheduling & Export

| Option           | Type         | Default | Description                                                 |
| ---------------- | ------------ | ------- | ----------------------------------------------------------- |
| `schedule`       | `dict`       | `None`  | Schedule: `{"cron": "0 * * * *"}` or `{"every_s": "600"}`  |
| `export`         | `dict`       | `None`  | Export: `{"format": "csv", "path": "output/report.csv"}`    |
| `quality_checks` | `list[dict]` | `None`  | Quality checks: `[{"type": "not_null", "column": "id"}]`   |

## Return Types

Model functions can return:

| Return Type        | Behaviour                                    |
| ------------------ | -------------------------------------------- |
| `ibis.Table`       | Passed through to materialisation            |
| `pandas.DataFrame` | Converted to ibis table                      |
| `list[dict]`       | Converted to table                           |
| `dict`             | Single row                                   |
| `None`             | Side-effect model (no output)                |
| generator          | All yielded values collected                 |

## Best Practices

1. **Keep models focused** - Each model should do one thing well
2. **Use meaningful names** - Model names become table names
3. **Prefer ibis operations** - They compile to efficient SQL
4. **Avoid `.execute()`** - Let Interlace handle execution
