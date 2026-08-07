---
title: 'No Jinja: What Replaces Templating When SQL Is an AST'
date: '2026-08-09'
author: Interlace Team
excerpt: Jinja does four separate jobs in a dbt project, and they need four different answers — not one templating language. Parsing replaces ref(), Python replaces loops, and canonical SQL means reformatting a model does not rebuild it.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="No Jinja: What Replaces Templating When SQL Is an AST" date="2026-08-09" />

Interlace has no templating language. A model is a `.sql` file containing SQL, or a `.py` file
containing a function. There is no `{{ }}`, no `{% %}`, and no macro system.

The reasonable first reaction is that we have simply removed capability. Jinja is doing real
work in a dbt project, and if you delete it you owe an answer for that work.

The answer is that Jinja is doing **four unrelated jobs**, which is why one mechanism doing all
four feels both indispensable and awkward. Separated, each has a better answer than a templating
language.

## Job one: `{{ ref() }}` — declaring dependencies

This is the most common use and the least necessary. `ref()` exists because dbt does not parse
your SQL; it needs you to declare the edge separately, in the text, and then it substitutes the
physical name.

But the dependency is already in the query. It is the `FROM` clause. Interlace parses the SQL
with sqlglot and reads the edges out of the AST:

```python
>>> from interlace.ir.canonicalize import parse, table_references
>>> sql = """SELECT o.id, c.tier FROM orders o
...          JOIN customers c USING (id)
...          WHERE o.d > (SELECT max(d) FROM watermark)"""
>>> sorted(table_references(parse(sql)))
['customers', 'orders', 'watermark']
```

Three dependencies, including one inside a correlated subquery, with nothing to declare. The
model is:

```sql
SELECT customer_id, name, tier FROM raw_customers
```

That is the whole file. It is also valid SQL you can paste into any client, which a Jinja
template is not.

## Job two: `{% for %}` — generating many models or many columns

This is Jinja's legitimate job, and the one people reach for when a project has fifty tenants or
a pivot over a list of payment methods.

Interlace's answer is that `.py` model files are **imported and executed** when the project
loads. Registering a model is a function call, so a loop over a list is a loop over a list:

```python
# models/per_tenant.py
from interlace.dsl.decorators import REGISTRY, ModelDef

def get_tenants():                    # any Python: a query, a file, an env var
    return ["acme", "globex", "initech"]

for tenant in get_tenants():
    REGISTRY.register_model(ModelDef(
        name=f"orders_{tenant}",
        sql=f"SELECT order_id, amount FROM raw WHERE tenant_id = '{tenant}'",
        strategy="merge",
        key=("order_id",),
    ))
```

Three real models, each with its own snapshot table, environment view, fingerprint, plan entry
and checks:

```
 Model            Output    Strategy   Depends on   Rows   Time
 raw              virtual   replace    —              +4   0.06s
 orders_acme      virtual   merge      raw            +2   0.12s
 orders_globex    virtual   merge      raw            +1   0.08s
 orders_initech   virtual   merge      raw            +1   0.05s
```

Note what `get_tenants()` can be. In Jinja it must be something the templating context can
reach. Here it is Python, so it can query a database, read a file, or call an API — and you can
unit-test it, because it is a function.

This is not a feature we built. It falls out of model files being ordinary Python that runs.

## Job three: macros — reusable SQL fragments

Jinja macros exist because SQL has no functions of its own that reach across files. Python has
had this for thirty years — a function that returns a SQL fragment:

```python
# macros.py — an ordinary module you can import and unit-test
def revenue_expr(currency: str) -> str:
    return f"sum(amount) FILTER (WHERE ccy = '{currency}') AS revenue_{currency}"
```

A macro is only useful if you can drop it into a model, and you can — the same import-and-register
from Job two, with the fragment interpolated into the SQL:

```python
# models/revenue.py
from interlace.dsl.decorators import REGISTRY, ModelDef
from macros import revenue_expr

REGISTRY.register_model(ModelDef(
    name="revenue",
    sql=f"SELECT customer_id, {revenue_expr('usd')}, {revenue_expr('eur')} "
        f"FROM orders GROUP BY customer_id",
))
```

That is a real model — its own snapshot, view, fingerprint, plan entry and checks — built from
`orders`, with `revenue_usd` and `revenue_eur` columns. The difference from a Jinja macro is not
expressive power; it is that `revenue_expr` has a type signature, a debugger, and a test framework
(`assert revenue_expr("usd").startswith("sum(")`), and a Jinja macro has none of those.

And because a model's fingerprint is its *rendered* SQL, editing the macro re-plans only the models
whose SQL actually changed — not, as in dbt, every model that happens to import it.

## Job four: `{{ config() }}` — per-model settings

Interlace puts configuration in a leading block comment, namespaced under `interlace`:

```sql
/* interlace:
  strategy: merge
  key: customer_id
  checks:
    - not_null: customer_id
    - unique: customer_id
*/
SELECT customer_id, name, tier FROM raw_customers
```

It is YAML inside a SQL comment. The file stays valid SQL — a comment is a comment — so your
editor, your formatter and your database client all still work on it.

## What the AST buys that text cannot

Removing Jinja is not the interesting part. The interesting part is what becomes possible once
the model is a parsed tree rather than a string to be expanded.

Interlace fingerprints the **canonical form** of the AST, not the file. So changes that cannot
affect the output do not rebuild anything:

```
  original           6b5428631ca23e11  same → reuse
  reformatted        6b5428631ca23e11  same → reuse
  comment added      6b5428631ca23e11  same → reuse
  extra whitespace   6b5428631ca23e11  same → reuse
  SEMANTIC CHANGE    259d4f1398cc67fa  DIFFERENT → rebuild
```

The first four are the same query written four ways — reflowed across lines, a comment added,
spacing changed. Same fingerprint, so downstream models are reused rather than rebuilt. The last
one changes `sum` to `avg`, and everything downstream of it rebuilds.

Run a formatter across your whole project and nothing rebuilds. That is not a heuristic about
whitespace; it is a consequence of hashing a tree rather than a file.

The same parsed tree is what makes column-level lineage, the breaking-change classification in
`interlace plan`, and cross-dialect transpilation possible. None of those can be built on
templated text, because until the template is rendered there is no query to reason about — and
after it is rendered, the structure that made it comprehensible is gone.

## What you give up

Honestly: dbt's macro ecosystem. `dbt_utils` and its relatives are a large body of tested,
shared SQL, and "write a Python function" is not the same as installing a package that thousands
of people already use. If your project leans on that ecosystem, this is a real cost and you
should weigh it.

You also give up templating inside SQL as a general escape hatch. When you want conditional SQL,
the answer is to build the string in Python and register it — which is more explicit and
slightly more verbose than an inline `{% if %}`.

---

More in [Dynamic Models](/docs/guides/dynamic-models) and [SQL Models](/docs/guides/sql-models),
or install it:

```bash
pip install interlaced
```
