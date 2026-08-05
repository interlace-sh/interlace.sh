---
title: Dynamic Models
---

# Dynamic Models

Interlace has no templating DSL for generating models — because it doesn't need one. Model `.py` files are **imported, and their top-level code runs**, every time the project loads. A `@model` decorator registers a model the instant it executes, and `REGISTRY.register_model(...)` registers one directly. So an ordinary Python loop _is_ the mechanism for turning a list into many models — one per tenant, region, or source, each with its own filter or key.

This is emergent, not a feature bolted on: your models are real Python, executed at discovery. Anything Python can produce a list of, a loop can turn into models.

## Per-Tenant SQL Models

Register a `ModelDef` for each item in a list. Each becomes a full model — its own snapshot table, environment view, fingerprint, plan/apply, checks, and incremental ledger:

```python
# models/per_tenant.py
from interlace.dsl.decorators import REGISTRY, ModelDef

def get_tenants():                       # any Python: a DB query, a file, an env var…
    return ["acme", "globex"]

for tenant in get_tenants():
    REGISTRY.register_model(ModelDef(
        name=f"orders_{tenant}",
        sql=f"SELECT order_id, amount FROM raw WHERE tenant_id = '{tenant}'",
        strategy="merge",
        key=("order_id",),
    ))
```

This produces `orders_acme`, `orders_globex`, … — one isolated model each, not a shared table with a `tenant` column.

## Per-Tenant Python Models

For [Python models](/docs/guides/python-models), wrap the decorator in a **factory** so each closure captures its own value. This is the one thing to get right:

```python
from interlace import model
import pyarrow.compute as pc

def make(tenant):
    @model(name=f"orders_{tenant}", depends_on=("raw",),
           strategy="merge", key=("order_id",))
    def _orders(raw, tenant=tenant):     # bind tenant HERE, not via the loop variable
        t = raw.table()
        return t.filter(pc.equal(t["tenant_id"], tenant))
    return _orders

for t in get_tenants():
    make(t)
```

## Gotchas

- **Names must be unique.** `register_model` raises `DefinitionError` on a duplicate, so put the distinguishing value in the name (`orders_{tenant}`).
- **Closure late-binding.** The classic Python trap: a `@model` defined inside a bare `for` loop closes over the loop _variable_, so every generated function ends up filtering on the _last_ value. Bind it via a factory or a default argument (`tenant=tenant` above).
- **`depends_on` for Python models.** A Python model's function parameters must each be a declared dependency — Python models don't auto-discover edges the way SQL models do from their table references.
- **The generator runs on every command.** `get_tenants()` is called each time `interlace` loads the project (`plan`, `apply`, `models`, `serve`). Keep it fast and deterministic; if it hits a database, every CLI call pays that cost. **`interlace serve` compiles once at startup**, so a tenant added while the daemon is running only appears after it re-compiles or restarts.
- **Quote interpolated values.** For a trusted internal list, string-interpolating into SQL is fine. For untrusted input, quote via sqlglot or parameterise — the interpolation is plain Python `f`-strings with no escaping of its own.

## When Not To

If you want a _single_ model carrying a `tenant` column — no per-tenant tables — that's just an ordinary model with `tenant` in its `SELECT` and `GROUP BY`. Reach for the loop above only when you want the same logic applied _per tenant with isolation_: separate tables, separate fingerprints, separate check results.

## Next Steps

- [SQL models](/docs/guides/sql-models) — the `ModelDef` fields, spelled as config
- [Python models](/docs/guides/python-models) — the `@model` factory in depth
- [Models](/docs/core-concepts/models) — the full decorator and config reference
