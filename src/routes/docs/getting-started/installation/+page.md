---
title: Installation
---

# Installation

Get Interlace up and running in your environment.

## Requirements

- Python 3.12 or higher

## Install

The package is published to PyPI as **`interlaced`**; it installs the **`interlace`** command. Interlace v2 is a pre-release, so pass `--pre` (or pin a version):

```bash
pip install --pre "interlaced[service]"
# or
uv pip install "interlaced[service]"
```

The `service` extra brings the daemon: HTTP API, scheduler, and web UI. Plain `pip install --pre interlaced` gives you the core CLI only.

### Extras

| Extra      | Adds                                                    |
| ---------- | ------------------------------------------------------- |
| `service`  | `interlace serve` — HTTP API, scheduler, and web UI     |
| `adbc`     | Postgres as an execution engine (Arrow-native transfer) |
| `postgres` | psycopg driver                                          |
| `polars`   | Polars interop                                          |
| `pandas`   | pandas interop                                          |
| `all`      | `service` + `adbc` + `postgres` + `polars`              |

## Verify Installation

```bash
interlace --version
```

You should see the version, e.g. `interlace 2.0.0a4`.

## Initialize a Project

```bash
interlace init my-project
cd my-project
```

This scaffolds a working project:

```
my-project/
├── interlace.yaml       # Project configuration
├── README.md
└── models/
    ├── raw_events.sql   # A seed model (inline VALUES)
    └── event_totals.sql # An aggregate with data-quality checks
```

The generated `interlace.yaml` points the warehouse at a local DuckLake:

```yaml
name: my-project
default_dialect: duckdb
database: ducklake:.interlace/warehouse.ducklake
```

The `.interlace/` directory (warehouse data, state database, stream log) is created on first use — add it to `.gitignore`.

## Next Steps

Now that Interlace is installed, [create your first model](/docs/getting-started/first-model).
