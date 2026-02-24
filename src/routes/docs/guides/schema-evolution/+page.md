---
title: Schema Evolution
---

# Schema Evolution

When a model's output schema changes between runs -- columns added, removed, or types changed -- Interlace handles the change based on the configured schema mode. Schema changes are tracked in the state database for auditing.

## Schema Modes

Set the mode via the `schema_mode` parameter on `@model`, or globally in `config.yaml`.

### strict

Fail on any schema mismatch. Column additions, removals, and all type changes produce errors.

Use for production schemas that must not change unexpectedly.

```python
@model(name="contracts", schema_mode="strict", materialise="table")
def contracts(raw_contracts):
    return raw_contracts
```

### safe (default)

Allow column additions and safe type widening (e.g. `int32` to `int64`). Column removals produce a warning and are preserved with `NULL` values for new data. Unsafe type changes (narrowing, incompatible) produce errors.

Good balance for most development workflows.

```python
@model(name="users", schema_mode="safe", materialise="table")
def users(raw_users):
    return raw_users
```

### flexible

Allow column additions and removals. Safe type widening is applied automatically. Unsafe type changes produce a warning and Interlace will attempt coercion.

Use for schemas that are actively evolving.

```python
@model(name="events", schema_mode="flexible", materialise="table")
def events(raw_events):
    return raw_events
```

### lenient

Allow all changes including type coercion. Unsafe type changes produce a warning but are coerced where possible.

Use for experimental or permissive schemas.

```python
@model(name="experiments", schema_mode="lenient", materialise="table")
def experiments(raw_data):
    return raw_data
```

### ignore

Skip schema validation entirely. No schema checks are performed.

Use for legacy systems or when schema management is handled externally.

```python
@model(name="legacy_import", schema_mode="ignore", materialise="table")
def legacy_import(source):
    return source
```

## Choosing a Mode

| Mode     | Column Add | Column Remove | Type Widen | Type Narrow | Use Case                       |
| -------- | ---------- | ------------- | ---------- | ----------- | ------------------------------ |
| strict   | Fail       | Fail          | Fail       | Fail        | Production, contractual schemas |
| safe     | Allow      | Warn          | Allow      | Fail        | Normal development (default)    |
| flexible | Allow      | Allow         | Allow      | Warn        | Evolving schemas                |
| lenient  | Allow      | Allow         | Allow      | Warn        | Experimental, permissive        |
| ignore   | Skip       | Skip          | Skip       | Skip        | Legacy, external management     |

Safe type widening includes casts such as `int8` to `int16`/`int32`/`int64`, `int32` to `int64`, `float32` to `float64`, and `string` to `text`.

## Usage

### Per-Model

```python
@model(name="users", schema_mode="strict", materialise="table")
def users(raw_users):
    return raw_users
```

### Global Default (config.yaml)

```yaml
models:
  default_schema_mode: safe
```

Per-model settings override the global default.

## Fields Parameter

Use `fields` to declare an expected schema. By default, fields are merged with the inferred schema -- extra columns in the data are kept.

```python
@model(
    name="users",
    fields={"id": "int64", "name": "string", "email": "string"},
    materialise="table",
)
def users(raw_users):
    return raw_users
```

With `strict=True`, only the columns listed in `fields` are output. Extra columns are dropped:

```python
@model(
    name="users",
    fields={"id": "int64", "name": "string", "email": "string"},
    strict=True,
    materialise="table",
)
def users(raw_users):
    return raw_users
```

Fields accepts multiple formats:

- **Dict:** `{"id": "int64", "name": "string"}` or `{"id": int, "name": str}`
- **List of tuples:** `[("id", "int64"), ("name", "string")]`
- **ibis.Schema:** An existing `ibis.Schema` object

## Column Mapping

Rename columns during materialisation:

```python
@model(
    name="clean_users",
    column_mapping={"user_name": "name", "user_email": "email"},
    materialise="table",
)
def clean_users(raw_users):
    return raw_users
```

## Schema History

Interlace tracks all schema changes in the `interlace.schema_history` state table. Each version records column names, types, nullability, and primary key status with a timestamp.

```bash
# List all models and their current schemas
interlace schema list --env dev

# Compare a model's schema between two environments
interlace schema diff users --env1 dev --env2 prod
```

The `schema diff` command shows added columns, removed columns, and type changes between environments:

```bash
# Compare with a specific schema/database name
interlace schema diff orders --env1 staging --env2 prod --schema analytics
```
