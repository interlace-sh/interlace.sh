---
title: CLI Reference
description: 'Every interlace command, option and exit code: init, plan, apply, run, restate, serve, query, lineage, impact, checks, env and gc.'
---

# CLI Reference

Complete command-line interface documentation.

```bash
interlace [OPTIONS] COMMAND [ARGS]
```

| Global option     | Description               |
| ----------------- | ------------------------- |
| `--version`, `-v` | Show the version and exit |
| `--help`          | Show help for any command |

## Shared Options

Most commands accept a common set:

| Option           | Default | Description                                                                                                     |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `--env`, `-e`    | `prod`  | Target data environment (prod = the unprefixed namespace). Env var: `INTERLACE_ENV`                             |
| `--path`, `-p`   | `.`     | Project root                                                                                                    |
| `--select`, `-s` | all     | Model selectors: `name`, `+name`, `name+`, `tag:x`, `state:modified` (repeatable — see [Selectors](#selectors)) |
| `--json`         | off     | Emit JSON instead of a table (for scripts and CI)                                                               |
| `--parallelism`  | `0`     | Models building at once (0 = the project's `parallelism`, default 4; 1 serialises)                              |

---

## interlace init

Scaffold a new interlace project from a template.

```bash
interlace init [PATH] [--name/-n NAME] [--template/-t NAME] [--list]
```

Copies a template into the directory: `interlace.yaml`, its models, and a README. `--template/-t` chooses the starter (default `quickstart`, a no-source SQL → Python → SQL chain); `--list` prints the available templates and any credentials each needs. `--name` defaults to the directory name. Fails if the directory is already initialised.

## interlace plan

Show what apply would change in an environment. Runs no SQL.

```bash
interlace plan [--env] [--path] [--select] [--forward-only] [--json]
```

Output classifies each change (`added`, `modified`, `removed`) with a category (`breaking`, `non_breaking`, `forward_only`) and whether the model will `rebuild` or `reuse`, plus any cross-engine transfers.

## interlace apply

Build changed models and promote the environment.

```bash
interlace apply [--env] [--path] [--select] [--forward-only] [--force] [--parallelism]
```

| Option           | Description                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `--force`        | Proceed even when the plan contains breaking changes                                                        |
| `--forward-only` | History-keeping models (merge/full_merge/hash_merge/scd/incremental) carry their history to the new version |

Exits 1 on a breaking plan without `--force`, or when a blocking check fails.

## interlace run

Force-build models and promote, ignoring change detection. For `incremental` models, `--start`/`--end` set the catchup window (default: the latest grain interval); intervals already in the ledger are skipped.

```bash
interlace run [--env] [--path] [--select] [--start ISO] [--end ISO] [--parallelism]
```

## interlace restate

Reprocess incremental models over a window, **ignoring** the interval ledger (vs `run`, which skips filled intervals).

```bash
interlace restate [--env] [--path] [--select] [--start ISO] [--end ISO] [--parallelism]
```

`--start`/`--end` must be ISO timestamps (exit code 2 otherwise); timezone-aware values are converted to local time.

## interlace models

List models with their materialisation, strategy, engine, and dependencies.

```bash
interlace models [--path] [--select] [--json]
```

## interlace lineage

Show a model's lineage — table-level, or column-level with `--columns`.

```bash
interlace lineage MODEL [--path] [--columns/-c] [--format/-f text|json|dot]
```

`dot` output is Graphviz — pipe to `dot -Tsvg`.

## interlace impact

Column-level blast radius: every downstream column transitively derived from `MODEL.COLUMN`, plus opaque consumers (Python models and `*` projections that read the source model whole). Compile only.

```bash
interlace impact MODEL.COLUMN [--path] [--json]
```

Same data as the HTTP [`GET /models/{name}/impact`](/docs/reference/api).

## interlace query

Run a read-only `SELECT` against the warehouse and print the result. `SELECT` only — the same parse-time fence as the web console (real tables and views, never table functions or file readers). Unqualified names resolve to the promoted (prod) views; capped at `--limit` rows (max 10,000).

```bash
interlace query "SELECT * FROM raw_events" [--path] [--limit/-n 100]
```

The CLI counterpart of the [`POST /query`](/docs/reference/api) console.

## interlace runs

Recent runs from the durable queue (newest first). The trigger column derives from each run's idempotency key: `cron`, `interval`, `api`, or `stream`.

```bash
interlace runs [--path] [--limit/-n 20] [--json]
```

## interlace cancel

Cancel a run: queued cancels now; running cancels at the worker's next heartbeat.

```bash
interlace cancel RUN_ID [--path]
```

## interlace streams

Declared streams with their log head and warehouse watermark.

```bash
interlace streams [--path] [--json]
```

## interlace engines

Configured execution engines (models pin to these with `engine:`). Credentials in DSNs are redacted.

```bash
interlace engines [--path] [--json]
```

## interlace gc

Garbage-collect snapshots no environment references, and their physical tables.

```bash
interlace gc [--path] [--grace 7d] [--dry-run]
```

| Option      | Default | Description                                                      |
| ----------- | ------- | ---------------------------------------------------------------- |
| `--grace`   | `7d`    | Keep unreferenced snapshots younger than this (`12h`, `7d`, ...) |
| `--dry-run` | off     | Report what would be removed without touching anything           |

Also trims old events, check results, and finished queue rows, and sweeps stream retention.

## interlace scheduler

Run the scheduler loop only (no HTTP): tick triggers, flush streams, drain due runs, and sweep stream retention. Needs a live warehouse.

```bash
interlace scheduler [--env] [--path] [--interval 60.0] [--once]
```

`--once` runs a single tick + drain, then exits.

## interlace serve

Run the interlace daemon: HTTP API + scheduler in one process. Requires the `service` extra.

```bash
interlace serve [--env] [--path] [OPTIONS]
```

| Option                       | Default     | Description                                           |
| ---------------------------- | ----------- | ----------------------------------------------------- |
| `--host`                     | `127.0.0.1` | Bind host                                             |
| `--port`                     | `8000`      | Bind port (if busy, the next free port is used)       |
| `--scheduler/--no-scheduler` | on          | Run the scheduler loop in this process                |
| `--interval`                 | `60.0`      | Seconds between scheduler ticks                       |
| `--quack`                    | —           | Also serve the warehouse, e.g. `quack:localhost:4213` |
| `--quack-token`              | generated   | Auth token for `--quack` (printed if generated)       |

## interlace env

Inspect and manage environments.

```bash
interlace env list [--path] [--json]                       # promoted models + drift per environment
interlace env drop NAME [--path] [--force]                 # drop views; snapshots become gc-reclaimable
interlace env rollback [NAME] [--to N] [--list] [--json]   # repoint views at an earlier promotion
```

Dropping `prod` requires `--force`.

`env rollback` repoints an environment's views at an earlier promotion generation — **nothing rebuilds**. `--to N` selects a generation (default: the one before the latest); `--list` shows the promotion history instead (state only). The rollback itself needs a live warehouse.

## interlace checks

Run and inspect data-quality checks.

```bash
interlace checks run [--env] [--path] [--select] [--json]
interlace checks list [--path] [--model/-m NAME] [--limit/-n 20] [--json]
```

`checks run` verifies an environment's promoted tables without rebuilding; results are recorded; exits 1 when any error-severity check fails.

## interlace apikey

Manage HTTP API keys.

```bash
interlace apikey create NAME [--scope read] [--scope write] [--scope admin] [--path]
interlace apikey revoke NAME [--path]
interlace apikey list [--path]
```

`create` prints the `ilk_` token **once**. `revoke` disables every key with that name immediately (it refuses to remove the last remaining key — that would disable auth).

---

## Selectors

`--select`/`-s` is repeatable, and each value may list several selectors separated by commas or spaces; the results are unioned. Accepted by `plan`, `apply`, `run`, `restate`, `models`, and `checks run`.

| Selector         | Matches                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `model`          | The model, exactly                                                                              |
| `+model`         | The model and its ancestors (upstream)                                                          |
| `model+`         | The model and its descendants (downstream)                                                      |
| `+model+`        | The model, its ancestors, and its descendants                                                   |
| `tag:x`          | Every model carrying tag `x` (a tag matching nothing raises, so a CI gate can't silently no-op) |
| `state:modified` | Models whose fingerprint differs from the target environment's promoted mapping (the CI diff)   |

Affixes compose with `tag:` and `state:` (`tag:x+`, `state:modified+`). An empty `state:modified` match is legitimate — it just means nothing changed.

---

## Exit Codes

| Code | Meaning                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------- |
| 0    | Success                                                                                        |
| 1    | Failure: breaking plan without `--force`, blocking check, unknown model/env/run, missing extra |
| 2    | Malformed input (non-ISO `--start`/`--end`, bad `--grace`, bad `--format`)                     |
