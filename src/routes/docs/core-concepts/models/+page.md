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
  strategy: merge
  key: order_id
  columns: {order_id: BIGINT, customer_id: BIGINT, amount: DOUBLE}
  checks:
    - not_null: order_id
*/
SELECT order_id, customer_id, amount
FROM raw_orders
```

The header is optional — a bare `SELECT` is a valid model (materialised as a `virtual` snapshot with a full refresh). The rest of the file must be exactly one SQL statement.

### Header Options

| Key            | Type               | Default      | Description                                                                                                                          |
| -------------- | ------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `name`         | `str`              | path-derived | Override the model name                                                                                                              |
| `materialise`  | `str`              | `"virtual"`  | `virtual` · `view` · `ephemeral` (owned) or `table` · `file` (terminal) — see [materialization](/docs/core-concepts/materialization) |
| `strategy`     | `str`              | `"full"`     | `full`, `merge`, `full_merge`, `hash_merge`, `scd`, `incremental` (+ `append` for a terminal `table`)                                |
| `key`          | `str \| list[str]` | —            | Key column(s) for merge/SCD strategies                                                                                               |
| `time_column`  | `str`              | —            | Window column for `incremental`                                                                                                      |
| `interval`     | `str`              | —            | Grain for `incremental`, e.g. `1d`, `6h`, `15m`                                                                                      |
| `backfill`     | `str`              | `"auto"`     | First-build window for `incremental`: `auto`, `none`, or an ISO date                                                                 |
| `dialect`      | `str`              | engine's     | SQL dialect this model is written in                                                                                                 |
| `engine`       | `str`              | default      | Pin execution to a named engine from `interlace.yaml`                                                                                |
| `depends_on`   | `str \| list[str]` | —            | Explicit dependencies (inference usually suffices)                                                                                   |
| `columns`      | `list \| mapping`  | —            | Output contract — see below                                                                                                          |
| `checks`       | `list`             | —            | Data-quality checks ([reference](/docs/guides/quality-checks))                                                                       |
| `schedule`     | `mapping`          | —            | `{cron: "0 6 * * *"}` or `{every: 5m}`                                                                                               |
| `target`       | `str`              | —            | External table for `materialise: table` — `alias.schema.table`                                                                       |
| `path`         | `str`              | —            | Output path for `materialise: file`                                                                                                  |
| `format`       | `str`              | —            | `parquet`, `csv`, or `json` for `materialise: file`                                                                                  |
| `environments` | `list[str]`        | `[prod]`     | Which environments a terminal `table`/`file` actually delivers to                                                                    |
| `tags`         | `str \| list[str]` | —            | Labels for `tag:` selectors                                                                                                          |
| `owner`        | `str`              | —            | Owner or team identifier (metadata)                                                                                                  |
| `description`  | `str`              | —            | Human-readable description (metadata)                                                                                                |

Unknown keys are ignored, and only the **first** block comment in the file is parsed — keep the config block above any other `/* ... */` comment.

## Python Models

Python models use the `@model` decorator and exchange Apache Arrow data:

```python
from interlace import model
import pyarrow as pa

@model(depends_on=["orders", "customers"], strategy="merge", key="order_id")
def enriched_orders(orders, customers) -> pa.Table:
    o, c = orders.table(), customers.table()
    return o.join(c, keys="customer_id")
```

The decorator registers the model and returns the function **unchanged**, so it stays an ordinary, unit-testable Python function. The name defaults to the function name.

### Decorator Options

`@model` accepts the same options as the SQL header (`materialise`, `strategy`, `key`, `dialect`, `engine`, `depends_on`, `interval`, `time_column`, `tags`, `owner`, `description`, `columns`, `schedule`, `checks`), plus one Python-only option:

| Option   | Type  | Description                                                                                                                   |
| -------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cursor` | `str` | A column of this model's output whose max value is injected on the next run — see [reserved parameters](#reserved-parameters) |

Python models are always `virtual` (an owned snapshot): `view` and `ephemeral` are SQL-only, and the terminal `table`/`file` planes need a SQL model (write one over the Python model's output). They also can't use `incremental` — use `cursor` with `merge` instead.

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
@model(strategy="merge", key="id", cursor="updated_at")
def events(cursor):
    return fetch_rows(since=cursor)   # cursor is None on the first run
```

- **`this`** — a `RelationHandle` over this model's previous materialisation (`None` on the first run), for anti-join and self-referential patterns.

## Dynamic / Programmatic Models

A model `.py` file is **imported and its top-level code runs** every time the project loads (discovery executes each module), and a model registers the instant its declaration runs. So an ordinary Python loop _is_ the mechanism for generating many models from data — the same logic per tenant, region, or source, each with its own filter. There is no separate templating DSL; it's just Python.

**Per-tenant SQL models** — register a `ModelDef` directly for each item in a list:

```python
# models/per_tenant.py
from interlace.dsl.decorators import REGISTRY, ModelDef

def get_tenants():                      # any Python: a DB query, a file, an env var…
    return ["acme", "globex"]

for tenant in get_tenants():
    REGISTRY.register_model(ModelDef(
        name=f"orders_{tenant}",
        sql=f"SELECT order_id, amount FROM raw WHERE tenant_id = '{tenant}'",
        strategy="merge", key=("order_id",),
    ))
```

This produces one snapshot table and environment view per tenant (`orders_acme`, `orders_globex`, …), each with an independent fingerprint, plan/apply, checks, and incremental ledger — full isolation between tenants.

**Per-tenant Python models** — use a _factory_ so each closure captures its own value (the one thing to get right):

```python
from interlace import model
import pyarrow.compute as pc

def make(tenant):
    @model(name=f"orders_{tenant}", depends_on=("raw",), strategy="merge", key=("order_id",))
    def _orders(raw, tenant=tenant):          # bind tenant HERE, not via the loop variable
        t = raw.table()
        return t.filter(pc.equal(t["tenant_id"], tenant))
    return _orders

for t in get_tenants():
    make(t)
```

Things to get right:

- **Names must be unique** — `register_model` raises on a duplicate, so put the tenant in the name.
- **Closure late-binding** — the classic Python trap; bind the loop variable via a factory or a default argument (as above), or every generated function filters on the _last_ value.
- **`depends_on` for Python models** — a function's parameters must each be a declared dependency (SQL models auto-discover deps from their table references; Python models don't).
- **The generator runs on every command** — `get_tenants()` is called each time `interlace` loads the project (plan, apply, models, serve). Keep it fast and deterministic; if it queries a database, every CLI call pays that cost. **`interlace serve` compiles once at startup**, so a tenant added while the daemon is running only appears after it re-compiles/restarts.
- **Quote interpolated values** — for a trusted internal list, string interpolation into SQL is fine; for untrusted input, quote via sqlglot or parameterise.

If instead you want a _single_ model carrying a `tenant` column (no per-tenant tables), that's just an ordinary model — but for the same logic applied per tenant with isolation, the loop above is the right shape.

## Column Contracts

The `columns` option declares the model's output contract, in either form:

```yaml
columns: [order_id, customer_id, amount] # names only
columns: { order_id: BIGINT, amount: DOUBLE } # names + engine types
```

After every build, before the snapshot is recorded: a missing contracted column or a type mismatch (compared case-insensitively against the engine's reported types) fails the build. Extra columns beyond the contract are allowed — contracts guarantee a floor, not a ceiling.

## Fingerprints and Rebuild-Skip

Every model gets a **data fingerprint** — a hash of its canonical SQL (or Python source), its strategy config, and the sorted fingerprints of its upstreams. Any change that could affect output changes the fingerprint, which changes the physical snapshot table name. This is how `plan` knows what to rebuild; it classifies each changed model:

- **breaking** — output data may differ → rebuild; downstream inherits breaking.
- **additive** — only new columns appeared → rebuild; downstream stays non-breaking.
- **clean** — output provably identical → **not rebuilt**; the new snapshot reuses the previous physical table and the environment view just repoints.

**Column pruning** extends `clean` to semantic upstream changes: if a change provably touched only certain columns and a downstream provably consumes none of them, the downstream is clean too. Both proofs are conservative — any ambiguity falls back to "rebuild".

Two tools help you reason about this:

- `interlace impact <model>.<column>` — the column-level blast radius: every downstream column derived from that one, plus models that consume it wholesale (Python models or `*` projections).
- `--select state:modified` — target exactly the models whose fingerprint differs from what the target environment has promoted (add `+` for their descendants: `state:modified+`).

## Next Steps

- [Dependencies](/docs/core-concepts/dependencies) — how models connect
- [Strategies](/docs/core-concepts/strategies) — how tables are updated
- [Python models guide](/docs/guides/python-models) — streaming, cursors, patterns
