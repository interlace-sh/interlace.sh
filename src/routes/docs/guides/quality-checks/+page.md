---
title: Quality Checks
---

# Quality Checks

Quality checks run automatically after model materialisation during `interlace run`. They validate output data and store results in the state database, giving you confidence that your pipeline produces correct data.

## Configuration

Quality checks can be defined in two places: on the model decorator or in `config.yaml`. Decorator-level checks take precedence over config-level checks for the same model.

### Decorator Level

Attach checks directly to a model with the `quality_checks` parameter:

```python
from interlace import model

@model(
    name="users",
    materialise="table",
    quality_checks=[
        {"type": "not_null", "column": "id", "severity": "error"},
        {"type": "unique", "column": "email"},
        {"type": "accepted_values", "column": "status", "values": ["active", "inactive"]},
    ],
)
def users(raw_users):
    return raw_users.filter(raw_users.active == True)
```

### Config Level

Define checks in `config.yaml` under the `quality` key:

```yaml
quality:
  enabled: true
  fail_on_error: false    # Stop pipeline on error-severity failures
  checks:
    users:
      - type: not_null
        column: id
        severity: error
      - type: unique
        column: email
    orders:
      - type: row_count
        min_count: 100
        severity: warn
      - type: freshness
        column: updated_at
        max_age_hours: 24
```

## Check Types

Interlace includes six built-in check types. Five can be used from both YAML config and decorators. The `expression` check is Python-only.

| Type | Description | Key Parameters |
|------|-------------|----------------|
| `not_null` | No NULL values in a column | `column` |
| `unique` | All values are unique | `column` or `columns` |
| `accepted_values` | Values are in a whitelist | `column`, `values` |
| `freshness` | Timestamp column is recent | `column`, `max_age_hours` / `max_age_days` / `max_age_minutes` |
| `row_count` | Row count is within range | `min_count`, `max_count` |
| `expression` | Custom ibis boolean expression | `expression` (callable), `name` |

### not_null

Verify that a column contains no NULL values.

```yaml
- type: not_null
  column: id
  severity: error
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `column` | `str` | Yes | Column to check for NULLs |

### unique

Verify that all values are unique. Supports single columns and composite keys.

```yaml
# Single column
- type: unique
  column: email

# Composite key
- type: unique
  columns: ["tenant_id", "user_id"]
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `column` | `str` | One of `column` or `columns` | Single column to check |
| `columns` | `list[str]` | One of `column` or `columns` | Multiple columns for composite uniqueness |

### accepted_values

Verify that all values in a column are within a specified set.

```yaml
- type: accepted_values
  column: status
  values: ["active", "inactive", "pending"]
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `column` | `str` | Yes | Column to check |
| `values` | `list` | Yes | Allowed values |

When this check fails, it reports a sample of the invalid values found for debugging.

### freshness

Verify that a timestamp column has recent data. Useful for detecting stale data or broken upstream pipelines.

```yaml
# Data must be no older than 24 hours
- type: freshness
  column: updated_at
  max_age_hours: 24

# Data must be no older than 7 days
- type: freshness
  column: created_at
  max_age_days: 7
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `column` | `str` | Yes | Timestamp column to check |
| `max_age_hours` | `float` | At least one | Maximum age in hours |
| `max_age_days` | `float` | At least one | Maximum age in days |
| `max_age_minutes` | `float` | At least one | Maximum age in minutes |

Age parameters are additive -- you can combine them (e.g. `max_age_days: 1` + `max_age_hours: 6` = 30 hours). Empty tables are skipped automatically.

### row_count

Verify that the table row count falls within an expected range. At least one of `min_count` or `max_count` is required.

```yaml
# At least 100 rows
- type: row_count
  min_count: 100

# Between 1,000 and 10,000 rows
- type: row_count
  min_count: 1000
  max_count: 10000
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `min_count` | `int` | At least one | Minimum row count (inclusive) |
| `max_count` | `int` | At least one | Maximum row count (inclusive) |

### expression

Custom ibis boolean expression for checks that do not fit the built-in types. This check is Python-only -- it cannot be defined in YAML config because it requires a callable.

```python
from interlace.quality import ExpressionCheck

@model(
    name="orders",
    materialise="table",
    quality_checks=[
        ExpressionCheck(
            expression=lambda t: t["amount"] > 0,
            name="positive_amount",
        ),
        ExpressionCheck(
            expression=lambda t: t["start_date"] <= t["end_date"],
            name="valid_date_range",
            severity="warn",
        ),
    ],
)
def orders(raw_orders):
    return raw_orders
```

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `expression` | `callable` | Yes | Function taking an `ibis.Table`, returning a boolean column. `True` = pass, `False` = fail |
| `name` | `str` | Yes | Name for this check |
| `invert` | `bool` | No | If `True`, invert the expression (`True` = fail) |

## Severity Levels

Each check has a `severity` that controls pipeline behaviour on failure:

| Severity | Default | Behaviour |
|----------|---------|-----------|
| `error` | Yes | Marks the model as failed when `quality.fail_on_error: true` in config |
| `warn` | -- | Logs a warning but the pipeline continues |

If `severity` is omitted, it defaults to `error`.

Set `quality.fail_on_error: false` (the default) to run all checks without stopping the pipeline, regardless of severity. This is useful during development when you want visibility into data issues without blocking runs.

## Results Storage

Quality check results are persisted in the state database after each run. Each result includes:

| Field | Description |
|-------|-------------|
| `check_name` | Auto-generated or custom name (e.g. `not_null_id`) |
| `check_type` | The check type (`not_null`, `unique`, etc.) |
| `table_name` | Model that was checked |
| `status` | `passed`, `failed`, `skipped`, or `error` |
| `severity` | `error` or `warn` |
| `message` | Human-readable result description |
| `failed_rows` | Number of rows that failed |
| `total_rows` | Total rows checked |
| `duration_seconds` | How long the check took |

Results are accessible via the REST API at `/api/quality/results`.

## Example: Full Pipeline

```python
from interlace import model

@model(
    name="customers",
    materialise="table",
    strategy="merge_by_key",
    primary_key=["id"],
    quality_checks=[
        {"type": "not_null", "column": "id", "severity": "error"},
        {"type": "not_null", "column": "email", "severity": "error"},
        {"type": "unique", "column": "email"},
        {"type": "accepted_values", "column": "tier", "values": ["free", "pro", "enterprise"]},
        {"type": "row_count", "min_count": 1, "severity": "warn"},
    ],
)
def customers(raw_customers):
    return raw_customers.filter(raw_customers.active == True)
```

With matching config:

```yaml
quality:
  enabled: true
  fail_on_error: true
```

During `interlace run`, after `customers` is materialised, all five checks execute automatically. If `email` contains NULLs or duplicates, the model is marked as failed and the pipeline stops. If `row_count` drops to zero, a warning is logged but execution continues.

## Key Points

- Checks run automatically after materialisation -- no extra step needed.
- Ephemeral models skip quality checks (no persisted table to validate against).
- Quality results are stored per-run for historical tracking and trend analysis.
- Use `warn` severity for non-blocking checks during development.
- Decorator-level checks take precedence over config-level checks for the same model.
- The `expression` check type is Python-only and cannot be defined in YAML.
