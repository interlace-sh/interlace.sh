---
title: 'A Macro Is an Expression, Not a Template'
date: '2026-08-15'
author: Interlace Team
excerpt: dbt writes cents_to_dollars five times, once per adapter, because Jinja renders text and the text has to differ. Interlace writes it once. The interesting part is not the syntax — it is where the macro gets expanded, and what that costs you when you choose wrong.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="A Macro Is an Expression, Not a Template" date="2026-08-15" />

Here is `cents_to_dollars` from dbt's own demo project. It converts an integer column of cents
into a decimal of dollars, and it is five macros:

```sql
{% macro cents_to_dollars(column_name) -%}
    {{ return(adapter.dispatch('cents_to_dollars')(column_name)) }}
{%- endmacro %}

{% macro default__cents_to_dollars(column_name) -%}
    ({{ column_name }} / 100)::numeric(16, 2)
{%- endmacro %}

{% macro postgres__cents_to_dollars(column_name) -%}
    ({{ column_name }}::numeric(16, 2) / 100)
{%- endmacro %}

{% macro bigquery__cents_to_dollars(column_name) %}
    round(cast(({{ column_name }} / 100) as numeric), 2)
{% endmacro %}

{% macro fabric__cents_to_dollars(column_name) %}
    cast({{ column_name }} / 100 as numeric(16,2))
{% endmacro %}
```

A dispatcher and four implementations, for one division.

The variants are not gratuitous. Postgres would do integer division on `/`, so it casts first.
BigQuery spells the type `NUMERIC` and wants an explicit `round`. Each engine genuinely needs
different SQL, and someone had to know that and write it down five times — and will have to
write it a sixth time for the next warehouse.

The reason it is five, rather than one, is that Jinja renders **text**. A macro is a string
template, the output is a string, and a string that is correct on DuckDB is wrong on Postgres.
There is nowhere for the knowledge of dialects to live except in more templates.

## What a macro actually is

Strip the templating away and `cents_to_dollars` is a named expression with a parameter. Not a
string, not a code generator — an expression. `(amount / 100)` cast to a decimal, with a hole in
it where a column goes.

SQL has syntax for exactly this, and DuckDB implements it:

```sql
-- macros/money.sql
CREATE MACRO cents_to_dollars(amount) AS (amount / 100)::numeric(16, 2);
```

Interlace reads `macros/*.sql` at project load and makes those callable from any model:

```sql
-- models/stg_orders.sql
SELECT
    order_id,
    cents_to_dollars(subtotal) AS subtotal,
    cents_to_dollars(tax_paid) AS tax_paid
FROM raw_orders
```

That is the whole feature, as far as the syntax goes. One definition, called like a function,
in a file that is still valid SQL.

The interesting part is the next question.

## Where do you expand it?

A macro has to be substituted for its body at some point, and there are three places to do it.
The choice looks like an implementation detail and is not.

**In the text, before parsing.** This is Jinja, and it is where the five variants come from.
Substitution happens before anything understands the SQL, so the only thing that can vary by
engine is more text — hence adapter dispatch. You also lose the tree: until the template is
rendered there is no query to reason about, and once it is rendered the structure is gone.

**In the warehouse.** DuckDB and Postgres both support this natively — `CREATE MACRO` and
`CREATE FUNCTION` — and it is genuinely tempting. Register the macro against the engine once,
and every model can call it. The SQL stays short and the engine does the work.

It also quietly breaks the thing that decides what to rebuild.

Interlace fingerprints a model's **canonical SQL**. If `cents_to_dollars` lives in the
warehouse, then `SELECT cents_to_dollars(subtotal) FROM raw_orders` is the model's SQL, and it
is byte-identical whether the macro divides by 100 or by 1000. Change the macro, and:

- every model that calls it has an unchanged fingerprint;
- `plan` reports no changes;
- the tables that already exist keep the old arithmetic, indefinitely, with nothing anywhere
  indicating that they disagree with the definition.

That is the same failure as editing a seed CSV and being told there is nothing to do — except a
seed is data and this is logic. It is the worst kind of bug: silent, plausible, and discovered
by someone reconciling a number three weeks later.

**In the AST, at compile time.** This is what Interlace does. The call is replaced by the body
while the model compiles — after parsing, and before the fingerprint, the lineage graph and the
transpiler ever see the model.

That ordering is the whole design, and everything below falls out of it.

## One definition, every dialect

The expansion produces AST, not text, and AST is what the transpiler consumes. So the
dialect-specific knowledge stays where it already lived — in sqlglot — instead of in four more
macros. The single line above compiles to:

| engine    | rendered                                                                        |
| --------- | ------------------------------------------------------------------------------- |
| DuckDB    | `CAST((subtotal / 100) AS DECIMAL(16, 2))`                                      |
| Postgres  | `CAST((CAST(subtotal AS DOUBLE PRECISION) / NULLIF(100, 0)) AS DECIMAL(16, 2))` |
| Snowflake | `CAST((subtotal / NULLIF(100, 0)) AS DECIMAL(16, 2))`                           |
| BigQuery  | `CAST((subtotal / NULLIF(100, 0)) AS NUMERIC)`                                  |

Postgres gets its cast, because sqlglot knows Postgres does integer division. BigQuery gets
`NUMERIC`. Nobody wrote `postgres__cents_to_dollars`.

The honest version of this claim: sqlglot's dialect knowledge is doing the work, and it is not
infallible — a macro that leans on something genuinely engine-specific will still need your
attention. But the ordinary case, which is most of them, is handled by the layer that already
exists for it.

## Editing a macro rebuilds its callers

Because the expansion is part of the canonical SQL, the fingerprint covers the macro body.
Changing `100` to `1000` in `macros/jaffle.sql` and running `plan` against dbt's demo project:

```
 Model          Change     Category   Build
 stg_orders     modified   breaking   rebuild
 stg_products   modified   breaking   rebuild
 stg_supplies   modified   breaking   rebuild
 products       modified   breaking   rebuild
 order_items    modified   breaking   rebuild
 supplies       modified   breaking   rebuild
 orders         modified   breaking   rebuild
 customers      modified   breaking   rebuild
```

Three models call the macro. The other five are downstream of those three. Nobody declared that
relationship; it is the dependency graph doing its ordinary job on SQL that changed.

Note also what is _not_ in that list. The project has nineteen models; eleven of them neither
call the macro nor sit downstream of one that does, and they are untouched. Invalidation is on
the rendered SQL, not on "this file changed" — the same mechanism that lets you reformat a model
without rebuilding anything.

## Lineage sees the body, not just the call

Column lineage reads the AST, so it sees whatever the macro's body touches. This matters when
the body references something the call site does not mention:

```sql
CREATE MACRO net(x) AS x - shipping_fee;
```

```sql
SELECT id, net(subtotal) AS net_total FROM raw_orders
```

Where does `net_total` come from? With the macro expanded, both of its real sources:

```
net_total ← raw_orders.subtotal, raw_orders.shipping_fee
```

Left as an opaque function call, lineage can only follow the argument — `raw_orders.subtotal`
— and `shipping_fee` disappears from the graph, along with every impact analysis and
column-pruning decision that depends on it.

For a simple pass-through macro there is no difference; the argument is a column reference
either way. The difference appears exactly when the macro is doing something interesting, which
is when you want lineage to be right.

The same reasoning gives you dependency edges for free. A macro body may reference a model:

```sql
CREATE MACRO in_gbp(x) AS x * (SELECT rate FROM fx_rates);
```

Because expansion runs before dependency resolution, every model calling `in_gbp` gains a real
edge to `fx_rates` and builds after it. There is nothing to declare, for the same reason there
is nothing to declare for a `FROM` clause: the reference is in the tree.

## The rules

Small enough to state completely:

- **Scalar expressions only.** A table macro (`AS TABLE SELECT ...`) has no call site to expand
  into. That is a model, and models are the thing this tool is made of.
- **Macros may call macros**, to a depth of ten. Recursion is a compile error naming the model,
  not a hang.
- **Arity is checked** at compile time, naming the macro and the file it came from.
- **Definitions live in `macros/*.sql`**, configurable with `macro_paths`.

## What you give up

The macro does not exist in the warehouse. This is the real cost of expanding at compile time,
and it is worth being plain about: if you open a SQL client against the built tables, you cannot
call `cents_to_dollars`. It is a build-time abstraction, and ad-hoc queries do not get it.

If that matters more to you than rebuild correctness, the engine's own `CREATE MACRO` is right
there and Interlace will not stop you from running it — you will just be responsible for
noticing when a macro changes.

And the larger gap is unchanged: this is the mechanism, not the library. `dbt_utils` is a body
of tested SQL that thousands of people already use, and writing `generate_surrogate_key`
yourself — which is what dbt's demo project needs, and what
[our conversion of it](/blog/migrating-jaffle-shop) does — is not the same as installing it.

---

Macros are documented under [Models](/docs/core-concepts/models), and
[`examples/jaffle-shop`](https://github.com/interlace-sh/interlace/tree/master/examples/jaffle-shop)
uses them for both of the cases dbt's project has: a project macro, and a package macro with no
package to install. Or install it:

```bash
pip install interlaced
```
