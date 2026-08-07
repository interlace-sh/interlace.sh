---
title: 'Twenty-Five Million Rows in Five Seconds, and How to Check'
date: '2026-08-07'
author: Interlace Team
excerpt: A 25M-row DAG exercising every strategy, with a Python model in the hot path, built on one machine in 5.1 seconds. Here are the numbers, the machine, and the commands to reproduce all of it yourself.
---

<script>
  import { BlogHeader } from '$lib/components/blog';
</script>

<BlogHeader title="Twenty-Five Million Rows in Five Seconds, and How to Check" date="2026-08-07" />

Benchmarks in this industry are mostly untrustworthy, and usually for the same reason: the
person running them chose the shape of the work. So let us be precise about what this is and
what it is not.

This is **not** a comparison against dbt. dbt is not an execution engine — it generates SQL and
hands it to your warehouse — so "Interlace versus dbt" would be measuring DuckDB against
whatever you pointed dbt at, dressed up as a tool comparison. That number would tell you
nothing.

This is a **capability demonstration**: a real DAG doing real work, on hardware you can buy,
with every command written down. The point is not that a number is small. The point is that you
can run the same thing in the next ten minutes and get your own.

## The shape of the work

The `examples/benchmark` project generates 25 million synthetic events in-engine — nothing to
download, fully deterministic — and pushes them through a deliberately awkward fan-out:

```
events (25M rows) ── enriched (ephemeral: inlined into every consumer)
                      ├─ by_user ────┬─ user_ltv       (Python, Arrow batches, merge)
                      │              └─ user_history   (scd — Type 2 history)
                      ├─ by_product ─┬─ top_products   (view)
                      │              └─ product_catalog (full_merge, composite key)
                      ├─ by_device
                      └─ by_day
events ───────────── daily_revenue (incremental, 1d grain)
                      ├─ revenue_report (parquet file)
                      └─ daily_feed     (append → external DuckDB, reverse ETL)
```

Two details make this harder than it looks. `enriched` is **ephemeral**, so it is inlined as a
CTE into every consumer rather than materialised once — each of the four `by_*` branches scans
the full 25 million rows independently. And the branches share no edges, so they are eligible to
build concurrently.

Between them, twelve models exercise six of the seven strategies — `replace`, `incremental`,
`merge`, `full_merge`, `scd` and `append` (only `hash_merge` is absent) — across `virtual`,
`ephemeral`, `view`, `file` and an external `table`. There is a Python model in the hot path,
not bolted on at the end.

## The numbers

Machine: AMD Ryzen 9 9955HX3D (16 cores, 32 threads), 60 GB RAM, Linux. Python 3.12.3, DuckDB
1.5.4, PyArrow 23.0. A DuckLake warehouse on local disk.

Three consecutive cold builds — full teardown of the warehouse between each:

```
run 1: 5.19s
run 2: 5.10s
run 3: 4.98s
```

With CPU accounting on the same cold build:

|                      |             |
| -------------------- | ----------- |
| Wall clock           | **5.11s**   |
| CPU (user + system)  | 13.83s      |
| CPU utilisation      | 270%        |
| Peak resident memory | **1.84 GB** |

The gap between 13.83s of CPU and 5.11s of wall is the whole point of scheduling the true DAG:
independent branches build at the same time, and DuckDB parallelises inside each query. The
memory figure matters more than the time one — 25 million rows moved through a Python model and
five strategies without the process exceeding two gigabytes, because data crosses as streamed
Arrow `RecordBatch`es rather than being materialised into pandas at each boundary.

Per-model, from the build table:

```
 Model             Output    Strategy              Rows      Time
 events            virtual   replace         25,000,000     3.75s
 by_user           virtual   replace            100,000     0.46s
 top_products      view      replace                  —     0.37s
 product_catalog   virtual   full_merge          15,000     0.35s
 daily_feed        table     append                  29     0.31s
 daily_revenue     virtual   incremental     29     0.29s
 by_product        virtual   replace             15,000     0.21s
 user_ltv          virtual   merge              100,000     0.16s
 by_device         virtual   replace                  4     0.11s
 user_history      virtual   scd                100,000     0.09s
 by_day            virtual   replace                 30     0.07s
 revenue_report    file      replace                 29     0.07s
```

Generating the 25 million rows is 3.75s of the 5.11s. Everything downstream — five strategies, a
Python model, a Parquet write and a delivery into an external database — is the remaining 1.4
seconds of wall time.

Do not take the row counts on trust. Ask the warehouse:

```bash
interlace query "SELECT count(*) FROM events"
# 25000000
```

## The parts that are not about speed

Raw throughput is the least interesting thing here, because it is mostly DuckDB's. The
interesting behaviour is what happens on the second run.

**A repeated incremental window does nothing at all.** `daily_revenue` is
`incremental` at a one-day grain, and completed intervals are recorded in a ledger:

```bash
interlace run --select daily_revenue --start 2026-06-01 --end 2026-07-01
# Ran 0 model(s) (0 task(s)); promoted 1 to 'prod'.     0.35s
```

Zero tasks — not a fast rebuild, no rebuild. Reprocessing is a separate verb, so asking for it
is deliberate rather than accidental:

```bash
interlace restate --select daily_revenue --start 2026-06-08 --end 2026-06-15
# Checks: 7/7 passed
# Restated 1 model(s) (1 task(s)); promoted 1 to 'prod'.   0.67s
```

**A one-line change rebuilds one branch.** Add a column to `by_device`, one of four branches
hanging off a 25-million-row ephemeral scan:

```bash
sed -i 's/avg_ticket/avg_ticket, min(amount) AS min_ticket/' models/by_device.sql
interlace plan
```

```
 Model       Change     Category   Build
 by_device   modified   breaking   rebuild
```

One model, and `apply` then refuses to run it:

```
plan has breaking changes (by_device); re-run with --force to proceed
```

That refusal is the feature. Adding a column changes the shape of what consumers see, so it is
classified breaking and the build stops **before touching the warehouse** — the classification
is a gate, not a report. Forcing it through rebuilds only what changed:

```bash
interlace apply --force
# by_device   virtual   replace   +4   0.10s
# Built 1 model(s); promoted 13 to 'prod'.      0.48s wall
```

0.48s against 5.11s for the full build, and the other eleven models were never touched, because
their fingerprints did not move.

## Run it yourself

```bash
git clone https://github.com/interlace-sh/interlace
cd interlace/examples/benchmark
pip install interlaced

time interlace apply
interlace query "SELECT count(*) FROM events"
```

To make the machine work harder, raise `range(25000000)` in `models/events.sql`. At 100 million
the DAG shape does not change — each branch simply scans four times as much through the inlined
CTE.

If your numbers differ from ours, that is useful information and we would like to see them.
Different hardware, a different filesystem, a spinning disk, a container with two cores — all of
those will move these figures, and none of them are hidden behind a marketing chart.

## What this does not show

A single machine. Every number above comes from one process on one box, and that is the case
Interlace is built for. If your warehouse does not fit on one machine, this benchmark is not
evidence about your workload, and we would rather say so than let a chart imply otherwise.

It also says nothing about the engines we have not proven. These runs are DuckDB and DuckLake,
which are tested in CI. Spark is beta; Redshift, Snowflake, BigQuery and MotherDuck are alpha —
dialect-correct and unit-tested, but not yet run against a live account.

---

The DAG above is in [`examples/benchmark`](https://github.com/interlace-sh/interlace/tree/master/examples/benchmark).
Start with the [introduction](/docs/getting-started), or install it:

```bash
pip install interlaced
```
