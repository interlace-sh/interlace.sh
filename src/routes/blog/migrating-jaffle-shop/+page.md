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

The CTEs, the joins, the column list — untouched. Four of the five models needed nothing else,
because Interlace reads the dependency out of the `FROM` clause instead of asking you to declare
it. `customers.sql`, with its three CTEs and two left joins, converted without a single manual
edit.

Do not over-read this. `ref()` substitution is the easy half of any dbt project. The regex above
handles `ref('x')` and would need extending for `ref('package', 'x')`, `source()`, and anything
built by a macro.

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
        CheckSpec(type="not_null", columns=("customer_id",)),
        *(CheckSpec(type="not_null", columns=(f"{m}_amount",)) for m in PAYMENT_METHODS),
        CheckSpec(type="relationships", columns=("customer_id",),
                  params={"to": "customers", "field": "customer_id"}),
    ),
))
```

The checks loop too — the four `not_null`s on the pivot columns come from the same list that
generated them, so adding a payment method adds its column and its check together.

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
the model's own config block, so the model and its contract are one file:

```sql
/* interlace:
  checks:
    - unique: order_id
    - not_null: customer_id
    - accepted_values:
        column: status
        values: [placed, shipped, completed, return_pending, returned]
    - relationships:
        column: customer_id
        to: customers
        field: customer_id
*/
```

Whether that is better is taste. It is fewer files and less indirection; it is also a longer
header on models with many checks. What is not taste: Interlace checks **gate promotion** by
default, where `dbt test` is a separate command you have to remember to run in CI.

## What this does not tell you

jaffle_shop has no macros beyond one loop, no packages, no snapshots, no incremental models, no
custom materialisations, and no `dbt_utils`. A real project has several of those, and the
honest answer for each:

- **`dbt_utils` and packages** — no equivalent. This is the largest genuine gap, and "write a
  Python function" is not the same as a shared, tested package other people already use.
- **Snapshots** — `strategy: scd` covers Type 2 history, but the migration is not textual.
- **Incremental models** — `incremental` maps closely for SQL. For Python models it does
  not exist yet.
- **Custom materialisations** — no equivalent, by design.

If you are considering a migration and want a second pair of eyes on the awkward parts, we would
genuinely like to do one with you — partly to help, mostly because doing this one surfaced
rough edges we had stopped noticing, and fixed them.

---

Everything above is reproducible from
[`jaffle-shop-classic`](https://github.com/dbt-labs/jaffle-shop-classic). Start with the
[introduction](/docs/getting-started), or install it:

```bash
pip install interlaced
```
