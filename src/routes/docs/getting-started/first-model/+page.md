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
def raw_users() -> ibis.Table:
    """Load raw user data."""
    # In practice, you'd read from a file, API, or database
    data = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "name": ["Alice", "Bob", "Charlie", "Diana", "Eve"],
        "status": ["active", "inactive", "active", "active", "inactive"],
        "created_at": pd.date_range("2024-01-01", periods=5)
    })
    return ibis.memtable(data)
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
