---
title: 'Sandboxes That Cost Nothing'
date: '2026-08-03'
author: Interlace Team
excerpt: An environment is not a copy of your data, it is a set of views over it. How fingerprinted snapshots make a dev sandbox free, promotion an atomic view swap, and rollback the same operation run backwards.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Sandboxes That Cost Nothing" date="2026-08-03" />

If you work with external APIs, you know the problem. There is no `dev.github.com`, no
`staging.api.companieshouse.gov.uk`, no test endpoint for the thing you actually depend on.
Production is the only source. So how do you get a development environment without re-fetching
everything you already have?

The usual answer is to copy: duplicate the warehouse, or keep a separate dev database and sync
it periodically. Both are slow, both drift, and both cost storage in proportion to the number
of people on the team.

Interlace does something else. **An environment is not a copy of your data, it is a set of
views over it.**

## Fingerprints first

Every model gets a fingerprint: a hash of its canonical SQL — or its Python source — together
with its strategy configuration and its upstream fingerprints. A build writes an immutable
physical table named after that fingerprint.

```
interlace__main.orders__a1b2c3
```

That table never changes. If the model's definition changes, the new version gets a new
fingerprint and a new table, and the old one stays exactly where it is.

An **environment** is then just a set of views pointing at fingerprinted tables. Production is
the unprefixed namespace; every other environment prefixes its schema.

| Environment | View for `main.orders` |
| ----------- | ---------------------- |
| `prod`      | `main.orders`          |
| `dev`       | `dev__main.orders`     |
| `pr-142`    | `pr-142__main.orders`  |

Consumers and BI tools connect to `main.orders` and never learn that a fingerprint exists.
There is no environment list to configure, either — an environment exists once something has
been promoted to it.

## Why the sandbox is free

Here is where the re-fetching problem disappears. Applying to a sandbox does not rebuild models
whose fingerprint already exists. It points the sandbox's views at the tables production
already built.

```bash
interlace apply --env dev
```

Change one model out of forty and the sandbox builds one model. The other thirty-nine are
reused — not copied, reused, the same physical tables production is reading. The expensive
source extract that ran this morning is the table your sandbox reads this afternoon.

It goes further than "did this model change". Because the IR is
[an AST](/blog/the-ir-is-a-sqlglot-ast), impact analysis runs at column level: a semantic
change invalidates only the consumers of the columns it actually touched. A downstream model
whose output is provably identical is marked `reuse` in the plan and is not rebuilt at all.

```
$ interlace plan
 Model         Change    Category      Build
 orders        modified  non_breaking  rebuild
 order_stats   modified  non_breaking  reuse
```

`order_stats` sits downstream of a changed model and still does not rebuild, because the
analysis proved its output cannot differ.

## Promotion is a view swap

Since the tables are immutable and the environment is only a pointer, promoting to production
is an atomic view swap rather than a data migration.

```bash
interlace apply --env dev   # iterate in a sandbox
interlace plan              # see what prod would get
interlace apply             # promote
```

Two properties fall out of this, and both matter more than they sound.

**A failed apply changes nothing.** Views move only after data-quality checks pass. There is no
half-promoted state, because promotion is one operation rather than a sequence of them.

**Rollback is promotion run backwards.** Every promote records the environment's full mapping
as a generation in the promotion history. Rolling back repoints the views at an earlier
generation — the tables have not gone anywhere, so nothing rebuilds:

```bash
interlace env rollback --list
interlace env rollback --to 7
```

This is the marquee benefit of content-addressed snapshots. Recovery is not a restore. It is a
pointer move, and it takes about as long as a `CREATE OR REPLACE VIEW`.

## Reclaiming the space

Immutable tables accumulate, so `gc` reclaims them — reference-aware, so a snapshot production
still uses, or that another environment reuses, survives.

```bash
interlace env drop dev            # views and prefixed schemas go; tables remain
interlace gc                      # 7-day grace by default
interlace gc --grace 12h --dry-run
```

Dropping an environment deliberately leaves the underlying tables alone. They simply become
reclaimable.

## Sandboxes cannot touch production systems

There is one thing a virtual environment must never do, which is silently fan side-effecting
writes out to production.

Models that deliver outside the warehouse — an external table, a file — are
**environment-gated**. By default they fire only on a `prod` apply. A sandbox apply builds the
model and reports the delivery as _gated_ rather than writing to a live external table.

```sql
/* interlace:
  materialise: table
  target: crm.main.accounts
  strategy: merge
  key: id
  environments: [dev, prod]
*/
```

Widening the gate is explicit, and the gating list is part of the fingerprint — so widening it
re-plans the model rather than classifying it unchanged and never delivering.

This is the property that makes the whole thing usable in practice. You can run
`interlace apply --env dev` against real production source tables without any risk that a
half-finished model writes into your CRM.

## What it costs

Storage for one immutable table per fingerprint you have not yet collected, and a view per
model per environment. That is the entire overhead. There is no second warehouse, no sync job,
and no per-developer copy.

The next post is about the other half of the graph: why a Python model is not a special case.

---

Read the [environments guide](/docs/guides/environments) for drift, generations and `gc`, or
[schema evolution](/docs/guides/schema-evolution) for how changes get classified.
