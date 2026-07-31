---
title: Backfill
---

# Backfill

Models with `strategy: incremental_by_time` process one time window at a time and record every processed window in a durable **interval ledger**. Backfilling is window arithmetic against that ledger.

## The Interval Ledger

```sql
/* interlace:
  strategy: incremental_by_time
  time_column: day
  interval: 1d
*/
SELECT CAST(ts AS DATE) AS day, count(*) AS events, sum(amount) AS revenue
FROM events
GROUP BY day
```

Each build slices the requested window into `interval`-sized grains, processes them, and records them as filled. A routine `interlace apply` processes only the **latest** grain interval — history is managed explicitly with the commands below.

## Catch Up: interlace run

`run` force-builds the selected models over a window, **skipping intervals the ledger already covers**:

```bash
interlace run -s daily_revenue --start 2026-07-01 --end 2026-07-28
```

Perfect after downtime or when onboarding history: only the gaps are processed. With no `--start`/`--end`, the window defaults to the latest grain interval ending now.

## Reprocess: interlace restate

`restate` is the same window mechanics, but it **ignores the ledger** — every interval in the window is reprocessed:

```bash
interlace restate -s daily_revenue --start 2026-07-01T00:00:00 --end 2026-07-08T00:00:00
```

Use it when upstream data was corrected and the derived windows must be recomputed.

## Semantics

- `--start`/`--end` take ISO timestamps (`2026-07-01` or `2026-07-01T06:00:00`); timezone-aware values are converted to local time
- Both commands ignore change detection (every selected model builds) and end with promotion, so [checks](/docs/guides/quality-checks) gate them exactly like `apply`
- Non-incremental models in the selection are simply rebuilt in full
- Selectors work as everywhere: `-s daily_revenue+` restates the model and its downstream

## Via the API

`POST /runs` enqueues the same operation on the [daemon](/docs/guides/rest-api)'s durable queue:

```bash
curl -X POST localhost:8000/runs \
  -H 'content-type: application/json' \
  -d '{"selectors": ["daily_revenue"], "start": "2026-07-01T00:00:00",
       "end": "2026-07-08T00:00:00", "restate": true}'
```

The run is executed by the scheduler loop with leases and retries; watch it via `GET /runs/{id}`, `interlace runs`, or the web UI.

## Python Models

`incremental_by_time` is SQL-only. Python models backfill through the [`cursor` parameter](/docs/guides/python-models#incremental-extraction-with-cursor): the cursor is derived from the previous output's max value, so re-fetching history is a matter of what your function does when asked — or of rebuilding from `cursor=None` after a [forward-only](/docs/guides/schema-evolution#forward-only-changes) change.

## Next Steps

- [Strategies](/docs/core-concepts/strategies) — `incremental_by_time` in context
- [REST API](/docs/guides/rest-api) — runs, cancellation, and the queue
