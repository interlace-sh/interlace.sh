---
title: Python Models
---

# Python Models

A complete guide to writing Python models in Interlace.

## Basics

Python models use the `@model` decorator and return an `ibis.Table`:

```python
from interlace import model
import ibis

@model(name="my_model", materialize="table")
def my_model(source: ibis.Table) -> ibis.Table:
    return source.filter(source.active == True)
```

## Working with Ibis

Interlace uses [ibis](https://ibis-project.org/) for data transformations. Ibis expressions compile to SQL and execute in your database.

### Common Operations

```python
# Filter rows
filtered = table.filter(table.amount > 100)

# Select columns
selected = table.select(["id", "name", "amount"])

# Add computed columns
with_total = table.mutate(total=table.price * table.quantity)

# Aggregate
summary = table.group_by(table.category).agg(
    count=table.id.count(),
    total=table.amount.sum()
)

# Join tables
joined = orders.join(customers, orders.customer_id == customers.id)
```

## Reading External Data

Use ibis or DuckDB's native readers for files — they're faster than pandas and keep data lazy:

```python
@model(name="raw_data", materialize="table")
def raw_data() -> ibis.Table:
    # Preferred: ibis reads directly (stays lazy, no memory overhead)
    return ibis.read_csv("data/input.csv")
```

Other native readers:

```python
# Parquet files
ibis.read_parquet("data/output.parquet")

# JSON files
ibis.read_json("data/events.json")

# Multiple files with glob patterns
ibis.read_parquet("data/events/*.parquet")
```

For API responses or data that starts as Python dicts, return the data directly — Interlace converts it automatically:

```python
import httpx

@model(name="api_data", materialize="table")
def api_data() -> list[dict]:
    response = httpx.get("https://api.example.com/data")
    return response.json()  # list of dicts → converted to ibis.Table
```

## Best Practices

1. **Keep data as ibis.Table** - Don't call `.execute()` in model functions
2. **Use ibis/DuckDB readers for files** - `ibis.read_csv()`, `ibis.read_parquet()` keep data lazy
3. **Return dicts/lists for simple data** - Interlace converts them to tables automatically
4. **Apply filters early** - Reduce data volume as soon as possible
5. **Use explicit column selection** - Don't carry unnecessary columns
