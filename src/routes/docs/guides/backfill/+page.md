---
title: Backfill
---

# Backfill

Backfill lets you reprocess historical data by overriding the cursor bounds that incremental models use. Instead of picking up where the last run left off, a backfill run reads from a custom `since` timestamp (and optionally up to an `until` bound).

## How It Works

1. The `since` value replaces the stored cursor start, so models read data from that point forward.
2. The optional `until` value adds an upper-bound filter, limiting the window to a specific range.
3. **Force is auto-enabled** — change detection is bypassed so all targeted models re-execute.
4. **Cursor save is suppressed** — backfill runs do not update the stored cursor, so subsequent normal runs resume from the original position.

## CLI

```bash
# Reprocess all models from January through June 2024
interlace run --since "2024-01-01" --until "2024-06-30"

# Backfill a specific model
interlace run customer_staging --since "2024-01-01"

# Since without until — reprocess from the given date to now
interlace run --since "2024-03-15"
```

The `--since` flag automatically implies `--force`, so you don't need to pass both.

## Programmatic API

```python
from interlace import run

# Backfill a date range (works in both sync and async contexts)
results = run(since="2024-01-01", until="2024-06-30")

# Backfill specific models
results = run(
    models=["customer_staging", "order_staging"],
    since="2024-01-01",
    until="2024-03-31",
)
```

## REST API

```bash
# POST /api/v1/runs with since/until in the request body
curl -X POST http://localhost:8080/api/v1/runs \
  -H "Content-Type: application/json" \
  -d '{
    "since": "2024-01-01",
    "until": "2024-06-30"
  }'
```

**Request body fields:**

| Field    | Type               | Description                                            |
| -------- | ------------------ | ------------------------------------------------------ |
| `models` | `string[] \| null` | Models to run (`null` = all)                           |
| `force`  | `boolean`          | Force re-execution (auto-set when `since` is provided) |
| `since`  | `string`           | Override cursor start value                            |
| `until`  | `string`           | Upper bound for cursor filter                          |

The endpoint returns `202 Accepted` with a `run_id` you can use to track progress.

## Web UI

The **Execute** page has a **Backfill mode** toggle. When enabled, two date inputs appear for `since` and `until`. Submitting the form sends these values to the REST API and navigates to the run detail view.

## Cursor Reset

If you need a complete reprocess rather than a bounded backfill, you can delete the stored cursor value entirely:

```python
from interlace.core.state import StateStore

store = StateStore("path/to/state.db")
store.delete_cursor_value("my_model")
```

After deleting the cursor, the next normal run will process all available data from the beginning, as if the model had never run before.

## Tips

- **Test with a small range first.** Start with a narrow `since`/`until` window to verify the output before running a full historical backfill.
- **Backfill does not update cursors.** This means you can safely backfill without affecting future incremental runs.
- **Combine with model selection.** You don't have to backfill the entire pipeline — specify individual models to limit the scope.
