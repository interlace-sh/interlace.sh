---
title: Models
---

# Models

Models are the fundamental building blocks of Interlace pipelines. A model is a transformation that produces one table, written either as a SQL file or as a Python function.

## SQL Models

Any `.sql` file under a model path (default: `models/`) is a model. The file path becomes the model name and the name's dotted prefix becomes its schema:

| File                       | Model name      | Schema (default `main`) |
| -------------------------- | --------------- | ----------------------- |
| `models/orders.sql`        | `orders`        | `main`                  |
| `models/silver/orders.sql` | `silver.orders` | `silver`                |

Configuration lives in a leading block comment containing YAML under an `interlace:` key:

```sql
/* interlace:
  strategy: merge_by_key
  key: order_id
  columns: {order_id: BIGINT, customer_id: BIGINT, amount: DOUBLE}
  checks:
    - not_null: order_id
*/
SELECT order_id, customer_id, amount
FROM raw_orders
```

The header is optional — a bare `SELECT` is a valid model (materialised as a table with a full refresh). The rest of the file must be exactly one SQL statement.

### Header Options

| Key           | Type               | Default      | Description                                                                       |
| ------------- | ------------------ | ------------ | --------------------------------------------------------------------------------- |
| `name`        | `str`              | path-derived | Override the model name                                                           |
| `materialise` | `str`              | `"table"`    | `table`, `view`, or `ephemeral`                                                   |
| `strategy`    | `str`              | `"full"`     | `full`, `merge_by_key`, `full_merge`, `scd_type_2`, `incremental_by_time`         |
| `key`         | `str \| list[str]` | —            | Key column(s) for merge/SCD strategies                                            |
| `time_column` | `str`              | —            | Window column for `incremental_by_time`                                           |
| `interval`    | `str`              | —            | Grain for `incremental_by_time`, e.g. `1d`, `6h`, `15m`                           |
| `dialect`     | `str`              | engine's     | SQL dialect this model is written in                                              |
| `engine`      | `str`              | default      | Pin execution to a named engine from `interlace.yaml`                             |
| `depends_on`  | `str \| list[str]` | —            | Explicit dependencies (inference usually suffices)                                |
| `columns`     | `list \| mapping`  | —            | Output contract — see below                                                       |
| `checks`      | `list`             | —            | Data-quality checks ([reference](/docs/guides/quality-checks))                    |
| `schedule`    | `mapping`          | —            | `{cron: "0 6 * * *"}` or `{every: 5m}`                                            |
| `export`      | `mapping`          | —            | Deliver this model to a file or external table ([sinks](/docs/guides/sql-models)) |
| `tags`        | `str \| list[str]` | —            | Labels for `tag:` selectors                                                       |
| `owner`       | `str`              | —            | Owner or team identifier (metadata)                                               |
| `description` | `str`              | —            | Human-readable description (metadata)                                             |

Unknown keys are ignored, and only the **first** block comment in the file is parsed — keep the config block above any other `/* ... */` comment.

## Python Models

Python models use the `@model` decorator and exchange Apache Arrow data:

```python
from interlace import model
import pyarrow as pa

@model(depends_on=["orders", "customers"], strategy="merge_by_key", key="order_id")
def enriched_orders(orders, customers) -> pa.Table:
    o, c = orders.table(), customers.table()
    return o.join(c, keys="customer_id")
```

The decorator registers the model and returns the function **unchanged**, so it stays an ordinary, unit-testable Python function. The name defaults to the function name.

### Decorator Options

`@model` accepts the same options as the SQL header (`materialise`, `strategy`, `key`, `dialect`, `engine`, `depends_on`, `interval`, `time_column`, `tags`, `owner`, `description`, `columns`, `export`, `schedule`, `checks`), plus one Python-only option:

| Option   | Type  | Description                                                                                                                   |
| -------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cursor` | `str` | A column of this model's output whose max value is injected on the next run — see [reserved parameters](#reserved-parameters) |

Python models have two restrictions: they must materialise as `table` (not `view` or `ephemeral`), and they can't use `incremental_by_time` — use `cursor` with `merge_by_key` instead.

### Inputs: RelationHandle

Each dependency named as a function parameter arrives as a `RelationHandle` — a single-pass, streaming view of the upstream table:

| Method      | Returns                     | Use for                             |
| ----------- | --------------------------- | ----------------------------------- |
| `.table()`  | `pyarrow.Table`             | Eager, whole-table work             |
| `.reader()` | `pyarrow.RecordBatchReader` | Streaming with bounded memory       |
| `.schema`   | `pyarrow.Schema`            | Inspecting columns before consuming |

A handle can be consumed **once** — call `.table()` or `.reader()`, not both. Convert at the edges if you prefer another library: `handle.table().to_pandas()`, `polars.from_arrow(handle.table())`.

### Outputs

A Python model returns Arrow data:

| Return type                           | Behaviour                    |
| ------------------------------------- | ---------------------------- |
| `pyarrow.Table`                       | Loaded as-is                 |
| `pyarrow.RecordBatch`                 | Single batch                 |
| `pyarrow.RecordBatchReader`           | Streamed                     |
| iterable / generator of `RecordBatch` | Streamed with bounded memory |

Both `def` and `async def` are supported — sync functions run in a thread.

### Reserved Parameters

Two parameter names are reserved and injected by Interlace rather than mapped to dependencies:

- **`cursor`** — the max value of the declared cursor column from this model's previous build (`None` on the first run). The classic incremental-extraction pattern:

```python
@model(strategy="merge_by_key", key="id", cursor="updated_at")
def events(cursor):
    return fetch_rows(since=cursor)   # cursor is None on the first run
```

- **`this`** — a `RelationHandle` over this model's previous materialisation (`None` on the first run), for anti-join and self-referential patterns.

## Column Contracts

The `columns` option declares the model's output contract, in either form:

```yaml
columns: [order_id, customer_id, amount]          # names only
columns: {order_id: BIGINT, amount: DOUBLE}       # names + engine types
```

After every build, before the snapshot is recorded: a missing contracted column or a type mismatch (compared case-insensitively against the engine's reported types) fails the build. Extra columns beyond the contract are allowed — contracts guarantee a floor, not a ceiling.

## Next Steps

- [Dependencies](/docs/core-concepts/dependencies) — how models connect
- [Strategies](/docs/core-concepts/strategies) — how tables are updated
- [Python models guide](/docs/guides/python-models) — streaming, cursors, patterns
