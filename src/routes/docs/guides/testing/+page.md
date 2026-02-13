---
title: Testing
---

# Testing Models

Interlace ships a lightweight testing framework that lets you unit-test individual models with mock data — no project `config.yaml` or database connection required.

## Quick Start

```python
from interlace import model, test_model_sync, mock_dependency

@model(name="enriched", materialise="table")
def enriched(users, orders):
    return users.join(orders, users.id == orders.user_id)

result = test_model_sync(enriched, deps={
    "users": [{"id": 1, "name": "Alice"}],
    "orders": [{"id": 1, "user_id": 1, "amount": 42.0}],
})

assert result.status == "success"
assert result.row_count == 1
```

## Core API

### `mock_dependency(data, fields=None, strict=False)`

Converts raw Python data into an `ibis.Table` for use as a model dependency.

```python
from interlace import mock_dependency

# From a list of dicts
users = mock_dependency([
    {"id": 1, "name": "Alice", "active": True},
    {"id": 2, "name": "Bob", "active": False},
])

# From a dict of lists
orders = mock_dependency({
    "id": [1, 2],
    "user_id": [1, 1],
    "amount": [42.0, 18.5],
})

# With explicit schema
events = mock_dependency(
    [{"ts": "2024-01-01", "value": 10}],
    fields={"ts": "string", "value": "int64"},
    strict=True,  # Only keep columns listed in fields
)
```

**Parameters:**

| Param    | Type                                                  | Description                                 |
| -------- | ----------------------------------------------------- | ------------------------------------------- |
| `data`   | `list[dict]`, `dict[list]`, `DataFrame`, `ibis.Table` | Input data                                  |
| `fields` | `dict[str, str]`                                      | Optional schema, e.g. `{"id": "int64"}`     |
| `strict` | `bool`                                                | If `True`, only include columns in `fields` |

### `test_model_sync(func, deps=None, fields=None)`

Execute a model function synchronously with mock dependencies and return a `TestResult`.

```python
from interlace import model, test_model_sync

@model(name="active_users", materialise="view")
def active_users(users):
    return users.filter(users.active == True)

result = test_model_sync(active_users, deps={
    "users": [
        {"id": 1, "name": "Alice", "active": True},
        {"id": 2, "name": "Bob", "active": False},
    ],
})

assert result.status == "success"
assert result.row_count == 1
assert result.rows[0]["name"] == "Alice"
```

### `test_model(func, deps=None, fields=None)` (async)

The async version — use in `async def` tests or with `pytest-asyncio`:

```python
import pytest
from interlace import model, test_model

@model(name="summary", materialise="table")
def summary(orders):
    return orders.group_by("category").aggregate(
        total=orders.amount.sum()
    )

@pytest.mark.asyncio
async def test_summary():
    result = await test_model(summary, deps={
        "orders": [
            {"category": "A", "amount": 10},
            {"category": "A", "amount": 20},
            {"category": "B", "amount": 5},
        ],
    })
    assert result.row_count == 2
```

### `TestResult`

The object returned by `test_model` and `test_model_sync`.

| Property    | Type                 | Description                             |
| ----------- | -------------------- | --------------------------------------- |
| `status`    | `str`                | `"success"` or `"error"`                |
| `error`     | `str \| None`        | Error message if status is `"error"`    |
| `duration`  | `float`              | Execution time in seconds               |
| `table`     | `ibis.Table \| None` | The raw ibis result (lazy)              |
| `row_count` | `int \| None`        | Number of rows (executes a COUNT query) |
| `columns`   | `list[str]`          | Column names                            |
| `df`        | `DataFrame \| None`  | Result as a pandas DataFrame            |
| `rows`      | `list[dict]`         | Result as a list of dicts               |

## Pytest Fixtures

Interlace registers two pytest fixtures automatically:

### `interlace_test_db`

Provides an in-memory DuckDB connection via ibis:

```python
def test_raw_query(interlace_test_db):
    conn = interlace_test_db
    conn.raw_sql("CREATE TABLE t (id INT, name TEXT)")
    conn.raw_sql("INSERT INTO t VALUES (1, 'Alice')")
    result = conn.table("t")
    assert result.count().execute() == 1
```

### `interlace_mock`

Provides the `mock_dependency` helper as a fixture:

```python
def test_with_fixture(interlace_mock):
    users = interlace_mock([{"id": 1, "name": "Alice"}])
    assert users.count().execute() == 1
```

## Complete Example

```python
import pytest
from interlace import model, test_model_sync

# --- Model definition (models/enriched.py) ---

@model(
    name="order_summary",
    materialise="table",
    strategy="merge_by_key",
    primary_key=["user_id"],
)
def order_summary(users, orders):
    return (
        users.join(orders, users.id == orders.user_id)
        .group_by(["user_id", "name"])
        .aggregate(
            total_orders=orders.id.count(),
            total_spent=orders.amount.sum(),
        )
    )

# --- Test (tests/test_order_summary.py) ---

def test_order_summary_aggregation():
    result = test_model_sync(order_summary, deps={
        "users": [
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"},
        ],
        "orders": [
            {"id": 1, "user_id": 1, "amount": 50.0},
            {"id": 2, "user_id": 1, "amount": 30.0},
            {"id": 3, "user_id": 2, "amount": 10.0},
        ],
    })
    assert result.status == "success"
    assert result.row_count == 2

    rows = {r["name"]: r for r in result.rows}
    assert rows["Alice"]["total_orders"] == 2
    assert rows["Alice"]["total_spent"] == 80.0
    assert rows["Bob"]["total_orders"] == 1

def test_order_summary_empty_orders():
    result = test_model_sync(order_summary, deps={
        "users": [{"id": 1, "name": "Alice"}],
        "orders": [],
    })
    # Join with no matching rows → 0 results
    assert result.status == "success"
    assert result.row_count == 0

def test_order_summary_error_handling():
    # Missing required dependency raises error
    result = test_model_sync(order_summary, deps={
        "users": [{"id": 1, "name": "Alice"}],
        # "orders" is missing → function signature mismatch
    })
    assert result.status == "error"
    assert result.error is not None
```
