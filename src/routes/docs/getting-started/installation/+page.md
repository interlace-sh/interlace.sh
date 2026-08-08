---
title: Installation
description: 'Install Interlace with pip, uv, or as a project library. Needs Python 3.12+, with optional service, sources, adbc, spark and polars extras.'
---

# Installation

Get Interlace up and running in your environment.

## Requirements

- Python 3.12 or higher

## Install

The package is published to PyPI as **`interlaced`**; it installs the **`interlace`** command.

```bash
pip install interlaced          # or, isolated on PATH: uv tool install interlaced
```

That gives you the `interlace` CLI — the starting point, since `interlace init` scaffolds a project before one exists. The daemon (HTTP API, scheduler, web UI) is the `service` extra: `pip install 'interlaced[service]'`. Writing Python models that `import interlace`? Add it to your project instead — `uv add interlaced` (inside a `uv` project). Interlace requires Python 3.12+.

### Extras

| Extra      | Adds                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| `service`  | `interlace serve` — HTTP API, scheduler, and web UI                              |
| `adbc`     | Postgres as an execution engine (Arrow-native transfer)                          |
| `postgres` | psycopg driver                                                                   |
| `sources`  | REST source client (auth, pagination, retry) for pulling APIs into the warehouse |
| `polars`   | Polars interop                                                                   |
| `pandas`   | pandas interop                                                                   |
| `all`      | `service` + `adbc` + `postgres` + `polars` + `sources`                           |

## Verify Installation

```bash
interlace --version
```

You should see the version, e.g. `interlace 2.0.0`.

## Initialize a Project

```bash
interlace init my-project
cd my-project
```

This scaffolds a working project from the default **quickstart** template — a small SQL → Python → SQL chain that runs with no external data:

```
my-project/
├── interlace.yaml          # Project configuration
├── README.md
└── models/
    ├── raw_events.sql      # A seed model (inline VALUES)
    ├── enriched_events.py  # A Python model over Arrow (adds derived columns)
    └── event_summary.sql   # A rollup with data-quality checks
```

Other starters ship too — `interlace init --list` shows them, and `--template` picks one:

```bash
interlace init --list                        # quickstart, events, github, postgres
interlace init my-stream --template events   # durable @stream ingestion + live rollups
interlace init my-shop --template github     # pull GitHub issues via the REST source client
interlace init my-db --template postgres     # incrementally pull from a Postgres source
```

Source templates need the `sources` (or `postgres`) extra; `interlace init --list` shows what each requires.

The generated `interlace.yaml` points the warehouse at a local DuckLake:

```yaml
name: my-project
default_dialect: duckdb
database: ducklake:.interlace/warehouse.ducklake
```

The `.interlace/` directory (warehouse data, state database, stream log) is created on first use — add it to `.gitignore`.

## Next Steps

Now that Interlace is installed, [create your first model](/docs/getting-started/first-model).
