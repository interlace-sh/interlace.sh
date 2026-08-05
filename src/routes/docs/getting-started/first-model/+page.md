---
title: Your First Model
---

# Your First Model

Let's build a small pipeline: two SQL models, a data-quality gate, a sandbox environment, and the web UI.

## Scaffold a Project

```bash
interlace init my-project
cd my-project
```

`init` creates two example models. The source model is plain SQL:

```sql
-- models/raw_events.sql
SELECT * FROM (VALUES
    (1, 'signup', 12.0),
    (2, 'purchase', 40.0),
    (3, 'purchase', 8.5)
) AS t(event_id, kind, amount)
```

The aggregate declares data-quality checks in its header block:

```sql
-- models/event_totals.sql
/* interlace:
  checks:
    - not_null: kind
    - row_count: {min: 1}
*/
SELECT kind, count(*) AS events, sum(amount) AS total_amount
FROM raw_events
GROUP BY kind
```

Notice there is no configuration wiring the two together — Interlace parses `FROM raw_events` and infers the dependency.

## Preview the Plan

```bash
interlace plan
```

Every model shows as `added`. Nothing has run yet: `plan` compiles the project, fingerprints every model, and diffs against what each environment has promoted — it never touches the warehouse.

## Apply

```bash
interlace apply
```

Apply builds the changed models in dependency order, runs the checks against the fresh tables, and only then promotes the environment:

```
Built 2 model(s); promoted 2 to 'prod'.
```

Under the hood each build wrote an immutable physical table (`interlace__main.raw_events__a1b2c3d4e5f60718`-style names), and promotion pointed the production views (`main.raw_events`, `main.event_totals`) at them. If a check with `error` severity fails, no views move and the environment is not promoted.

## Change Something

Edit `event_totals.sql` — add a column, say `avg(amount) AS avg_amount` — and run `interlace plan` again. The change is classified for you: adding a column is `additive` (non-breaking); changing existing output is `breaking`, and `interlace apply` will refuse it unless you pass `--force`.

## Try a Sandbox

```bash
interlace apply --env dev
```

This builds into the same warehouse but promotes to a prefixed namespace: `dev__main.event_totals`. Production views are untouched. When you're done:

```bash
interlace env drop dev
```

## Open the Web UI

```bash
interlace serve
```

Then open http://127.0.0.1:8000/ui — you get lineage (with column-level tracing), the plan, runs, a SQL console, streams, checks, and live build feedback. The REST API and OpenAPI docs (`/schema/scalar`) run on the same port.

## Next Steps

- Learn about [models](/docs/core-concepts/models) in depth
- Understand [materialization](/docs/core-concepts/materialization) and [strategies](/docs/core-concepts/strategies)
- Explore [SQL models](/docs/guides/sql-models) and [Python models](/docs/guides/python-models)
