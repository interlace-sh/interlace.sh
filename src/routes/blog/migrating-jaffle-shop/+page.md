---
title: 'Migrating jaffle_shop: A Real dbt Project, End to End'
date: '2026-08-10'
author: Interlace Team
excerpt: We migrated dbt's own demo project to Interlace and wrote the whole thing down. Four of five models converted with a two-line regex. The fifth is where the actual work is, and where the interesting difference lives.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Migrating jaffle_shop: A Real dbt Project, End to End" date="2026-08-10" />

Every tool in this space claims migration is easy. The claim is usually made by someone who has
not migrated anything, so here is an actual one: `jaffle-shop-classic`, dbt's own demo project,
converted to Interlace, with the friction written down rather than edited out.

It is a small project — five models, three seed CSVs, twenty tests — which makes it a fair
subject for a walkthrough and a poor one for extrapolating effort. A real project has hundreds
of models and its own accumulated strangeness. What transfers from this exercise is the _shape_
of the work: which parts are mechanical, and which parts need a person.

The end state, before the details:

```
Checks: 20/20 passed
Built 8 model(s); promoted 8 to 'prod'.
```

Twenty tests in, twenty checks out.

## Seeds become models

dbt has a separate concept and a separate command for seeds: CSVs in `seeds/`, loaded by
`dbt seed`. Interlace has no seed concept, because a seed is just a model with no upstreams:

```sql
-- models/raw_customers.sql
SELECT * FROM read_csv_auto('seeds/raw_customers.csv')
```

Three files, one line each. This is a genuine simplification — the CSV now participates in the
DAG, gets a fingerprint, and rebuilds downstream models when it changes, which `dbt seed` does
not do on its own. But it is undocumented as a migration step, and we only worked it out by
trying. That is a docs gap on our side.

## Four of five models: a two-line regex

The staging models are the ordinary case, and the conversion is entirely mechanical. Here is
dbt's `stg_customers.sql`:

```sql
with source as (

    {#-
    Normally we would select from the table here, but we are using seeds to load
    our data in this project
    #}
    select * from {{ ref('raw_customers') }}

),
...
```

Two transformations cover it — strip Jinja comments, and turn `{{ ref('x') }}` into `x`:

```python
sql = re.sub(r'\{#-?.*?-?#\}', '', sql, flags=re.S)
sql = re.sub(r"\{\{\s*ref\(\s*['\"]([^'\"]+)['\"]\s*\)\s*\}\}", r'\1', sql)
```

That is the diff in full:

```diff
-    {#-
-    Normally we would select from the table here, but we are using seeds to load
-    our data in this project
-    #}
-    select * from {{ ref('raw_customers') }}
+    select * from raw_customers
```

The CTEs, the joins, the column list — untouched. Four of the five models converted this way,
because Interlace reads the dependency out of the `FROM` clause instead of asking you to declare
it. `customers.sql`, with its three CTEs and two left joins, needed nothing but the regex.

Do not over-read this. `ref()` substitution is the easy half of any dbt project. The regex above
handles `ref('x')` and would need extending for `ref('package', 'x')`, `source()`, and anything
built by a macro.

### The one place the mechanical pass broke

A subdirectory becomes part of the model's name. dbt's staging models live in `models/staging/`,
and Interlace names a model after its path, so `stg_customers` came out as
`staging.stg_customers` — and `customers.sql`'s `from stg_customers` stopped resolving. The
regex is not wrong; the layout is load-bearing in a way dbt's is not.

Either flatten the directory, or pin the name in the model's config block:

```sql
/*
interlace:
  name: stg_customers
*/
```

One line per staging model, in a config block those models already needed for their checks. It
is a small thing, and worth knowing before you run the regex over two hundred files and wonder
why the marts cannot see anything.

If every model of yours lives in a subdirectory — `models/staging/`, `models/marts/`, and
nothing loose in `models/` — there is a tidier fix: list the leaf directories as the model
paths, and the names come out bare with dbt's layout untouched.

```yaml
model_paths: [models/staging, models/marts]
```

They must not overlap, though: listing both `models` and `models/staging` registers every
staging model twice. jaffle_shop keeps `customers.sql` and `orders.sql` directly in `models/`,
so it cannot use this and pins the names instead.

## The fifth model is the real work

`orders.sql` uses Jinja for what Jinja is actually for:

```sql
{% set payment_methods = ['credit_card', 'coupon', 'bank_transfer', 'gift_card'] %}
...
        {% for payment_method in payment_methods -%}
        sum(case when payment_method = '{{ payment_method }}' then amount else 0 end)
            as {{ payment_method }}_amount,
        {% endfor -%}
```

A loop generating four pivot columns, twice — once in the aggregate, once in the passthrough.
There is no regex for this, and this is where a migration tool would hand you back a broken
file.

Whichever way you go, the Jinja list becomes a Python list — there is no templating layer to
put it in. What differs is whether the pivot itself ends up in Python or stays in SQL. Both are
below; both were built and produce byte-identical output.

(There is always a third option, and for a list this stable it may be the right one: expand the
four lines by hand and keep a plain `.sql` file. Nothing below is mandatory.)

### Option 1 — a Python model

Write it as a function. Parameters name the upstreams, so `stg_orders` and `stg_payments` are
the dependency edges, and the pivot is an ordinary loop over Arrow columns:

```python
# models/orders.py
import pyarrow as pa
import pyarrow.compute as pc
from interlace import model

PAYMENT_METHODS = ["credit_card", "coupon", "bank_transfer", "gift_card"]


@model()
def orders(stg_orders, stg_payments):
    payments = stg_payments.table()

    # The Jinja {% for %} pivot, as a Python loop over Arrow columns.
    cols = {"order_id": payments["order_id"]}
    for m in PAYMENT_METHODS:
        is_m = pc.equal(payments["payment_method"], m)
        cols[f"{m}_amount"] = pc.if_else(is_m, payments["amount"], 0.0)
    cols["amount"] = payments["amount"]

    per_method = (
        pa.table(cols)
        .group_by("order_id")
        .aggregate([(f"{m}_amount", "sum") for m in PAYMENT_METHODS] + [("amount", "sum")])
    )
    per_method = per_method.rename_columns(
        ["order_id"] + [f"{m}_amount" for m in PAYMENT_METHODS] + ["amount"]
    )
    return stg_orders.table().join(per_method, keys="order_id", join_type="left outer")
```

This is the version to reach for if the logic is heading somewhere SQL cannot follow — a model
call, a rate-limited API, a library with no SQL equivalent. It is also a plain function, so you
can call it in a unit test with no warehouse.

The cost is that the aggregation now happens in the Interlace process rather than in the
engine. On jaffle_shop's 113 payment rows that is irrelevant. On 25 million it would not be —
DuckDB should do that work, not PyArrow.

### Option 2 — a dynamic model

Keep the SQL, and generate it with the Python loop. Model files are imported and executed at
project load, so registering a `ModelDef` **is** declaring a model:

```python
# models/orders.py
from interlace import CheckSpec
from interlace.dsl.decorators import REGISTRY, ModelDef

PAYMENT_METHODS = ["credit_card", "coupon", "bank_transfer", "gift_card"]

pivot = ",\n        ".join(
    f"sum(case when payment_method = '{m}' then amount else 0 end) as {m}_amount"
    for m in PAYMENT_METHODS
)
passthrough = ",\n        ".join(f"order_payments.{m}_amount" for m in PAYMENT_METHODS)

REGISTRY.register_model(ModelDef(
    name="orders",
    sql=f"""
    with order_payments as (
        select order_id, {pivot}, sum(amount) as total_amount
        from stg_payments group by order_id
    )
    select stg_orders.order_id, stg_orders.customer_id, stg_orders.order_date,
           stg_orders.status, {passthrough},
           order_payments.total_amount as amount
    from stg_orders
    left join order_payments on stg_orders.order_id = order_payments.order_id
    """,
    checks=(
        CheckSpec(type="unique", columns=("order_id",)),
        CheckSpec(type="not_null", columns=("order_id",)),
        CheckSpec(type="not_null", columns=("customer_id",)),
        CheckSpec(type="not_null", columns=("amount",)),
        *(CheckSpec(type="not_null", columns=(f"{m}_amount",)) for m in PAYMENT_METHODS),
        CheckSpec(type="accepted_values", columns=("status",),
                  params={"values": ["placed", "shipped", "completed", "return_pending", "returned"]}),
        CheckSpec(type="relationships", columns=("customer_id",),
                  params={"to": "customers", "field": "customer_id"}),
    ),
))
```

That is `orders`' whole `schema.yml`, ten tests, in the file that defines the model. The checks
loop too — the four `not_null`s on the pivot columns come from the same list that generated
them, so adding a payment method adds its column and its check together.

The `relationships` check is the interesting one: it reads `customers`, which is a sibling in
the DAG rather than an upstream of `orders`. Interlace picks that up and schedules the check
after `customers` builds, so the ordering is not yours to get right.

This is the closer translation of what the Jinja was doing, and the better default: the
`{% set %}` becomes a Python list, the `{% for %}` becomes a generator expression, and the
generated SQL still runs in the engine where it belongs. The structure maps almost line for
line — which is the point, because the templating language was standing in for a programming
language, and now there is one.

The cost is that you are building SQL with string joins, and a malformed f-string produces a
parse error rather than a type error.

### Both were checked

Each version was built and queried against the invariant that matters — every pivot column sums
to the total:

```sql
SELECT count(*) AS mismatched_rows FROM orders
WHERE credit_card_amount + coupon_amount + bank_transfer_amount + gift_card_amount <> amount
-- 0
```

Zero for both, with matching rows throughout. **Prefer Option 2 unless the transformation needs
Python** — keeping the work in the engine is the difference that shows up at scale.

## Tests become checks

All four dbt test types used by jaffle_shop map one-to-one:

| dbt               | Interlace         |
| ----------------- | ----------------- |
| `unique`          | `unique`          |
| `not_null`        | `not_null`        |
| `accepted_values` | `accepted_values` |
| `relationships`   | `relationships`   |

The difference is location. dbt keeps tests in a separate `schema.yml`; Interlace puts them in
the model's own config block, so the model and its contract are one file. This is
`stg_orders.sql` in full, header and all:

```sql
/*
interlace:
  name: stg_orders
  checks:
    - unique: order_id
    - not_null: order_id
    - accepted_values:
        column: status
        values: [placed, shipped, completed, return_pending, returned]
*/
with source as (
    select * from raw_orders
),
...
```

The fourth type, `relationships`, is on `orders` — in the `CheckSpec` form above, because that
model is Python.

Whether that is better is taste. It is fewer files and less indirection; it is also a longer
header on models with many checks. What is not taste: Interlace checks **gate promotion** by
default, where `dbt test` is a separate command you have to remember to run in CI.

## We also timed it

The obvious next question, and the answer is duller than either side would like.

These timings are from the _newer_ jaffle_shop — the one with thirteen models and twenty-seven
tests, [converted alongside this
one](https://github.com/interlace-sh/interlace/tree/master/examples/jaffle-shop) — because it is
big enough to measure. Both tools ran on one machine against the same 896 MB of `jafgen` data
(3.47M orders, 5.3M order items), both writing a plain DuckDB file, dbt on `threads: 4` and
Interlace on `parallelism: 4`.

On the same thirteen models: **dbt 6.3s of engine time, Interlace 6.6s** — and Interlace's figure
includes twenty-seven checks that `dbt run` does not run. The two produce identical output, table
by table, to the cent.

That is the result we expected and the one worth stating plainly: both tools hand the same SQL to
the same DuckDB, so at this size neither is the bottleneck and neither should claim to be. **When
you compare two SQL transformation tools on one warehouse, you are almost never measuring
transformation.** You are measuring what each does around it.

Which is where the differences are:

- **Startup.** `dbt parse` spends 1.85s before any SQL runs; `interlace plan` on an unchanged
  project is 0.30s. On the 16 MB dataset the project actually ships with, that overhead _is_ the
  runtime — 3.05s against 0.77s — and it stops mattering as data grows. If you benchmark a tool
  on a small project, this is the only thing you are measuring.
- **Getting the data in.** `dbt seed` took 69.7s and 9.2 GB of RSS for those CSVs. DuckDB reads
  the same six files natively in 3.2s at 2.2 GB. Interlace has no seed step — a CSV is a model,
  so `read_csv_auto` runs in the engine like any other query.

  In fairness: seeds are meant for small reference data, and dbt's own project ships with
  `load_source_data: false` for exactly this reason. Pointing `dbt seed` at 896 MB uses it against
  its documented intent. We are reporting it because reading a CSV of that size is an ordinary
  thing to want, not because it is a fair fight.

Two runs each, one machine, warm cache — enough for a tie and an order-of-magnitude, not enough
to quote to three significant figures. The full table is in
[`examples/benchmark`](https://github.com/interlace-sh/interlace/tree/master/examples/benchmark#compared-with-dbt).

## What this does not tell you

jaffle_shop has no macros beyond one loop, no packages, no snapshots, no incremental models, no
custom materialisations, and no `dbt_utils`. A real project has several of those, and the
honest answer for each:

- **Macros** — `macros/*.sql` holds `CREATE MACRO` definitions, expanded into each model's AST
  at compile time. One definition covers every engine (the transpiler handles the dialect, so
  there is no `postgres__` variant to write), and because the expansion lands before the
  fingerprint, editing a macro rebuilds its callers.
- **`dbt_utils` and packages** — still no equivalent, and this is the largest genuine gap. A
  macro you write yourself is not the same as a shared, tested package other people already
  use; you get the mechanism, not the library.
- **Snapshots** — `strategy: scd` covers Type 2 history, but the migration is not textual.
- **Incremental models** — `incremental` maps closely for SQL. Python models need a `key` for
  it; without one, `cursor` with `merge` is the equivalent.
- **Custom materialisations** — no equivalent, by design.

If you are considering a migration and want a second pair of eyes on the awkward parts, we would
genuinely like to do one with you — partly to help, mostly because doing this one surfaced
rough edges we had stopped noticing, and fixed them.

---

Everything above is reproducible from
[`jaffle-shop-classic`](https://github.com/dbt-labs/jaffle-shop-classic), and the converted
project ships with Interlace as
[`examples/jaffle-shop-classic`](https://github.com/interlace-sh/interlace/tree/master/examples/jaffle-shop-classic) —
`interlace apply --env prod` in that directory is where the 20/20 above comes from.

dbt's _current_ jaffle_shop is converted alongside it, as
[`examples/jaffle-shop`](https://github.com/interlace-sh/interlace/tree/master/examples/jaffle-shop):
nineteen models, twenty-seven checks, and the things this project has none of — `source()`, a
project macro, a `dbt_utils` package macro, and a semantic layer that does not come across at
all. Start with the [introduction](/docs/getting-started), or install it:

```bash
pip install interlaced
```
