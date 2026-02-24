---
title: Materialization
---

# Materialization

How Interlace persists model results.

## Materialization Types

### Table

Creates a physical table in the database:

```python
@model(name="users", materialise="table")
def users(raw_users: ibis.Table) -> ibis.Table:
    return raw_users.filter(...)
```

Best for:

- Frequently accessed data
- Data that needs to be queried by other tools
- Final outputs

### View

Creates a database view (no physical storage):

```python
@model(name="user_summary", materialise="view")
def user_summary(users: ibis.Table) -> ibis.Table:
    return users.group_by(users.region).agg(count=users.id.count())
```

Best for:

- Lightweight transformations
- Data that changes with underlying tables
- Reducing storage costs

### Ephemeral

Creates a temporary table for the duration of the run:

```python
@model(name="intermediate", materialise="ephemeral")
def intermediate(source: ibis.Table) -> ibis.Table:
    return source.filter(...)
```

Best for:

- Intermediate transformations
- Data only needed during pipeline execution
- Complex multi-step transformations

### None

No output is persisted. The model function runs but nothing is written to the database:

```python
@model(name="notify", materialise="none")
def notify(alerts: ibis.Table) -> None:
    for row in alerts.execute().to_dict(orient="records"):
        send_notification(row)
```

Best for:

- Side-effect models (notifications, API calls, external writes)
- Models that push data to external systems

## Choosing a Materialization

| Type      | Persistence | Storage   | Query Speed |
| --------- | ----------- | --------- | ----------- |
| Table     | Permanent   | High      | Fast        |
| View      | None        | None      | Depends     |
| Ephemeral | Temporary   | Temporary | Fast        |
| None      | None        | None      | N/A         |
