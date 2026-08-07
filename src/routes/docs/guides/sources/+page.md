---
title: Sources
---

# Sources — pulling from APIs

Streaming (`@stream`) is ingestion by **push** — something POSTs events to the daemon. A **source model** is ingestion by **pull**: an ordinary `@model` that reaches out to an external system, fetches, and yields Arrow. There's no new subsystem — a source is just a model whose body makes network calls.

`interlace.sources` (the `sources` extra) removes the boilerplate every such model would repeat — auth, pagination, retry with backoff, rate limiting. It's a small synchronous REST client (Python models run in a worker thread, so blocking is the right fit) that streams pages and hands you `pyarrow.RecordBatch`es.

```bash
pip install "interlaced[sources]"
```

```python
import os
from interlace import model
from interlace.sources import RestClient, BearerAuth, NoAuth, LinkHeader, batches

@model(cursor="updated_at", strategy="merge", key="id")
def github_issues(cursor=None):
    auth = BearerAuth(env="GITHUB_TOKEN") if os.environ.get("GITHUB_TOKEN") else NoAuth()
    params = {"state": "all", "per_page": 100, "sort": "updated", "direction": "asc"}
    if cursor:
        params["since"] = cursor                       # only what changed since last run
    with RestClient("https://api.github.com", auth=auth) as api:
        pages = api.paginate("/repos/duckdb/duckdb/issues", params=params, paginator=LinkHeader())
        yield from batches(pages, columns=["id", "number", "title", "state", "updated_at"])
```

`interlace init --template github` scaffolds a complete version of this; `--template postgres` scaffolds a database source (via psycopg, with a seeded docker-compose).

## Incremental and idempotent

A source uses the same incremental machinery as any Python model:

- `@model(cursor="<column>")` injects the **max value of that column already loaded** (`None` on the first build) into the `cursor` parameter. Pass it to the API's "changed since" filter and each run fetches only new rows.
- `strategy="merge", key="<pk>"` **upserts** by primary key, so re-reading the boundary row (most "since" filters are inclusive) is idempotent — no duplicates, no lost updates.

Refresh with `interlace run` (or a schedule): `apply` only rebuilds when a model's *code* changes, not when the upstream data does.

## `RestClient`

```python
RestClient(base_url, *, auth=None, headers=None, params=None,
           rate_limit=None, timeout=30.0, max_retries=4, user_agent="interlace-source/2")
```

| Method | Returns | Notes |
| --- | --- | --- |
| `get_json(url, *, params=None)` | decoded JSON | one request |
| `paginate(url, *, params=None, paginator=None, data_key=None)` | iterator of **pages** (`list` of records) | streams one page at a time — memory stays bounded |
| `records(url, ...)` | iterator of **records** | flattens `paginate` |

`data_key` selects the records array from the body (a dotted path like `"data"` or `"result.items"`); omit it when the body *is* the array. Requests retry on network errors and `429`/`5xx` with jittered backoff (honouring `Retry-After`); other `4xx` raise. `rate_limit` throttles to N requests/second.

## Pagination

| Paginator | Follows |
| --- | --- |
| `SinglePage()` | nothing — one request |
| `PageNumber(page_param="page", size_param="per_page", size=100)` | the page number until a short page |
| `Offset(offset_param="offset", limit_param="limit", limit=100)` | the offset by `limit` until a short page |
| `Cursor(cursor_param=..., next_selector=...)` | a next-cursor token in the body (dotted path) |
| `LinkHeader()` | the RFC 5988 `Link: …; rel="next"` header (GitHub) |

## Authentication

Each credential is a literal **or** an `env=` variable name — the secret stays out of the repo, read from the environment at run time (a missing var raises a clear error).

| Auth | Sends |
| --- | --- |
| `NoAuth()` | nothing (default) |
| `BearerAuth(token=None, env=None)` | `Authorization: Bearer <token>` |
| `ApiKeyAuth(key=None, env=None, header="X-API-Key", param=None, scheme=None)` | a header, or a query param when `param` is set |
| `BasicAuth(username, password)` | `Authorization: Basic …` |

## Records → Arrow

- `to_batch(records, *, columns=None, schema=None)` — one `RecordBatch` from a list of records. `columns` keeps just those keys (missing → null); `schema` pins types (and lets an empty page through).
- `batches(pages, *, columns=None, schema=None)` — a stream of pages → a stream of batches, one per non-empty page (what a `@model` yields).

For non-REST sources (a database, a file), skip the client: connect with the right driver inside the model and yield `RecordBatch`es directly — the `postgres` template does this with `psycopg`.
