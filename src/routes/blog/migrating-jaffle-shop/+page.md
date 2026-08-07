---
title: 'Migrating jaffle_shop: A Real dbt Project, End to End'
date: '2026-08-10'
author: Interlace Team
excerpt: We migrated dbt's own demo project to Interlace and wrote down everything, including the parts that were annoying. Four of five models converted with a two-line regex. The fifth is where the actual work is, and where the interesting difference lives.
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

There are two honest options. Expand it by hand — it is four lines, written twice, and for a
list this stable that is arguably the better answer. Or translate the loop into the language
Interlace actually uses for this, which is Python:

```python
# models/orders.py
from interlace.dsl.decorators import REGISTRY, ModelDef
from interlace.checks import CheckSpec

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
    checks=(...),
))
```

The Jinja `{% set %}` becomes a Python list, and the `{% for %}` becomes a generator expression.
The structure maps almost line for line, which is the point: the templating language was
standing in for a programming language, and now there is one.

Verified against the invariant that matters — every pivot column sums to the total:

```sql
SELECT count(*) AS mismatched_rows FROM orders
WHERE credit_card_amount + coupon_amount + bank_transfer_amount + gift_card_amount <> amount
-- 0
```

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

## The parts that were annoying

Three things cost us time, and all three are our fault rather than dbt's.

**`CheckSpec` was hard to find.** It lives at `interlace.checks`, not `interlace.dsl.checks`
where the rest of the DSL is, and it is not re-exported from the top-level package. We guessed
wrong twice.

**Two spellings of the same thing.** In a SQL config block a check is `- not_null: customer_id`.
In Python it is `CheckSpec(type="not_null", columns=("customer_id",))` — `columns`, plural, as a
tuple. Two syntaxes for one concept is a papercut we should remove.

**A typo in a model file produces a traceback.** An `ImportError` in `models/orders.py` printed
a twelve-frame Python stack rather than one clean line naming the file. Errors from user code
should look like errors from user code.

None of these are hard to fix, and all three are on the list because of this exercise. That is
most of the argument for doing migrations in public.

## What this does not tell you

jaffle_shop has no macros beyond one loop, no packages, no snapshots, no incremental models, no
custom materialisations, and no `dbt_utils`. A real project has several of those, and the
honest answer for each:

- **`dbt_utils` and packages** — no equivalent. This is the largest genuine gap, and "write a
  Python function" is not the same as a shared, tested package other people already use.
- **Snapshots** — `strategy: scd` covers Type 2 history, but the migration is not textual.
- **Incremental models** — `incremental_by_time` maps closely for SQL. For Python models it does
  not exist yet.
- **Custom materialisations** — no equivalent, by design.

If you are considering a migration and want a second pair of eyes on the awkward parts, we would
genuinely like to do one with you — partly to help, mostly because the last one produced three
bug reports and a docs gap.

---

Everything above is reproducible from
[`jaffle-shop-classic`](https://github.com/dbt-labs/jaffle-shop-classic). Start with the
[introduction](/docs/getting-started), or install it:

```bash
pip install interlaced
```
