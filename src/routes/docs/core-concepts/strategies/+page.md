---
title: Strategies
---

# Strategies

Strategies determine how model results are updated when the pipeline runs.

## Available Strategies

### Replace (Default)

Drops and recreates the table on each run:

```python
@model(name="daily_snapshot", materialise="table", strategy="replace")
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
@model(name="event_log", materialise="table", strategy="append")
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
    materialise="table",
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

### SCD Type 2

Slowly Changing Dimension Type 2 -- maintains full history of changes by versioning rows:

```python
@model(
    name="customer_history",
    materialise="table",
    strategy="scd_type_2",
    primary_key=["customer_id"]
)
def customer_history(customers: ibis.Table) -> ibis.Table:
    return customers
```

Interlace automatically manages:

- `valid_from` -- timestamp when the row became current
- `valid_to` -- timestamp when the row was superseded (`NULL` for current)
- `is_current` -- boolean flag for the active version

Best for:

- Audit-sensitive dimensions (customer status changes, pricing history)
- Regulatory compliance requiring full change history
- Analytics that need point-in-time lookups

### None

No persistence -- the model runs but nothing is written to the database:

```python
@model(name="send_alerts", materialise="none", strategy="none")
def send_alerts(failed_checks: ibis.Table) -> None:
    for row in failed_checks.execute().to_dict(orient="records"):
        send_slack_notification(row)
```

Best for:

- Side-effect models (notifications, API calls)
- Models that write to external systems

## Choosing a Strategy

| Strategy     | New Rows | Updated Rows    | Deleted Rows    | History |
| ------------ | -------- | --------------- | --------------- | ------- |
| Replace      | All      | All (recreated) | All (recreated) | No      |
| Append       | Added    | Ignored         | Ignored         | No      |
| Merge        | Added    | Updated         | Ignored         | No      |
| SCD Type 2   | Added    | Versioned       | Ignored         | Yes     |
| None         | --       | --              | --              | --      |
