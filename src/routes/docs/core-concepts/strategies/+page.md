---
title: Strategies
---

# Strategies

Strategies determine how model results are updated when the pipeline runs.

## Available Strategies

### Replace (Default)

Drops and recreates the table on each run:

```python
@model(name="daily_snapshot", materialize="table", strategy="replace")
def daily_snapshot(source: ibis.Table) -> ibis.Table:
    return source
```

Best for:

- Full refreshes
- Small to medium tables
- Data that doesn't need history

### Append

Adds new rows without removing existing data:

```python
@model(name="event_log", materialize="table", strategy="append")
def event_log(new_events: ibis.Table) -> ibis.Table:
    return new_events
```

Best for:

- Event logs
- Time-series data
- Audit trails

### Merge by Key

Updates existing rows and inserts new ones based on primary key:

```python
@model(
    name="customers",
    materialize="table",
    strategy="merge_by_key",
    primary_key=["customer_id"]
)
def customers(raw_customers: ibis.Table) -> ibis.Table:
    return raw_customers
```

Best for:

- Dimension tables
- Data with natural keys
- Incremental updates

## Choosing a Strategy

| Strategy | New Rows | Updated Rows    | Deleted Rows    |
| -------- | -------- | --------------- | --------------- |
| Replace  | All      | All (recreated) | All (recreated) |
| Append   | Added    | Ignored         | Ignored         |
| Merge    | Added    | Updated         | Ignored         |
