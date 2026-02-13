---
title: Your First Model
---

# Your First Model

Let's build a simple data pipeline with Interlace.

## Create a Source Model

First, create a model that reads some source data. Create `models/users.py`:

```python
from interlace import model
import ibis
import pandas as pd

@model(name="raw_users", materialize="table")
def raw_users():
    """Load raw user data."""
    # In practice, you'd read from a file, API, or database
    return [
        {"id": 1, "name": "Alice", "status": "active", "created_at": "2024-01-01"},
        {"id": 2, "name": "Bob", "status": "inactive", "created_at": "2024-01-02"},
        {"id": 3, "name": "Charlie", "status": "active", "created_at": "2024-01-03"},
        {"id": 4, "name": "Diana", "status": "active", "created_at": "2024-01-04"},
        {"id": 5, "name": "Eve", "status": "inactive", "created_at": "2024-01-05"},
    ]
```

## Create a Transformation Model

Now create a model that transforms the raw data. Add to `models/users.py`:

```python
@model(name="active_users", materialize="table")
def active_users(raw_users: ibis.Table) -> ibis.Table:
    """Filter to only active users."""
    return raw_users.filter(raw_users.status == "active")
```

Notice how `raw_users` is automatically passed as a dependency based on the function parameter name.

## Run Your Pipeline

Execute your pipeline:

```bash
interlace run
```

You'll see output showing each model being executed:

```
[1/2] raw_users ✓
[2/2] active_users ✓

Pipeline completed successfully
```

## View Results in the Web UI

Start the web UI to explore your models and data:

```bash
interlace serve
```

Then open http://localhost:8080 in your browser to see your models, their dependencies, and execution history.

## Next Steps

- Learn about [models](/docs/core-concepts/models) in depth
- Understand [materialization strategies](/docs/core-concepts/materialization)
- Explore [Python models](/docs/guides/python-models) and [SQL models](/docs/guides/sql-models)
