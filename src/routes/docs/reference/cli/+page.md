---
title: CLI Reference
---

# CLI Reference

Complete command-line interface documentation.

## Global Options

```bash
interlace [OPTIONS] COMMAND [ARGS]
```

| Option            | Description           |
| ----------------- | --------------------- |
| `--version`, `-v` | Show version and exit |
| `--help`          | Show help message     |

## Commands

### run

Execute the pipeline:

```bash
interlace run [MODELS...] [OPTIONS]
```

| Option                     | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `MODELS`                   | Specific models to run (positional, optional -- runs all if omitted) |
| `--env ENV`                | Environment (dev, staging, prod)                                    |
| `--verbose`, `-v`          | Enable verbose output                                               |
| `--project-dir`, `-d PATH` | Project directory (default: current)                                |
| `--force`, `-f`            | Force execution (bypass change detection)                           |
| `--since DATE`             | Backfill start bound (overrides cursor start)                       |
| `--until DATE`             | Backfill end bound (upper limit for cursor filter)                  |

Examples:

```bash
# Run all models
interlace run

# Run specific models
interlace run users orders

# Force full refresh
interlace run --force

# Backfill a date range
interlace run --since "2024-01-01" --until "2024-06-30"

# Backfill a specific model
interlace run customer_staging --since "2024-01-01"
```

### info

Display project information:

```bash
interlace info [OPTIONS]
```

| Option                     | Description                          |
| -------------------------- | ------------------------------------ |
| `--env ENV`                | Environment                          |
| `--verbose`, `-v`          | Show detailed model information      |
| `--project-dir`, `-d PATH` | Project directory (default: current) |

Shows discovered models, connections, and project configuration.

### serve

Start the web UI and API server:

```bash
interlace serve [OPTIONS]
```

| Option                     | Description                          |
| -------------------------- | ------------------------------------ |
| `--env ENV`                | Environment (dev, staging, prod)     |
| `--host HOST`              | Server host (default: 127.0.0.1)     |
| `--port PORT`              | Server port (default: 8080)          |
| `--no-scheduler`           | Disable background scheduler         |
| `--no-ui`                  | Disable web UI serving               |
| `--run`                    | Run all models on startup            |
| `--project-dir`, `-d PATH` | Project directory (default: current) |
| `--verbose`, `-v`          | Enable verbose output                |

See the [REST API & Service](/docs/guides/rest-api) guide for endpoint documentation.

### init

Initialize a new project:

```bash
interlace init [DIRECTORY]
```

Creates a new Interlace project with the standard directory structure.

### plan

Preview the execution plan without running models:

```bash
interlace plan [MODELS...] [OPTIONS]
```

| Option                     | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `MODELS`                   | Specific models to plan (optional -- all if omitted) |
| `--force`                  | Assume all models will be re-executed             |
| `--format FORMAT`          | Output format: `table` (default), `json`, `summary` |
| `--schema`                 | Include schema information                        |
| `--project`, `-d PATH`     | Project directory                                 |

### schema

Schema management and diffing:

```bash
interlace schema SUBCOMMAND [OPTIONS]
```

#### schema list

List all model schemas in an environment:

```bash
interlace schema list [OPTIONS]
```

| Option                     | Description                          |
| -------------------------- | ------------------------------------ |
| `--env ENV`                | Environment                          |
| `--schema SCHEMA`          | Filter by schema name                |
| `--project-dir`, `-d PATH` | Project directory                    |

#### schema diff

Compare a model's schema between two environments:

```bash
interlace schema diff MODEL [OPTIONS]
```

| Option                     | Description                          |
| -------------------------- | ------------------------------------ |
| `MODEL`                    | Model name to compare                |
| `--env1 ENV`               | First environment                    |
| `--env2 ENV`               | Second environment                   |
| `--schema SCHEMA`          | Schema name                          |
| `--project-dir`, `-d PATH` | Project directory                    |

### lineage

View column-level lineage:

```bash
interlace lineage SUBCOMMAND [OPTIONS]
```

#### lineage show

Show lineage for a model:

```bash
interlace lineage show MODEL [OPTIONS]
```

| Option           | Description                                         |
| ---------------- | --------------------------------------------------- |
| `MODEL`          | Model name                                          |
| `--column COL`   | Show lineage for a specific column                  |
| `--upstream`     | Show upstream lineage only                          |
| `--downstream`   | Show downstream lineage only                        |
| `--depth N`      | Maximum depth to traverse                           |
| `--format FMT`   | Output format: `tree`, `table`, `json`, `dot`       |
| `--project PATH` | Project directory                                   |

#### lineage refresh

Recompute column lineage:

```bash
interlace lineage refresh [MODEL] [OPTIONS]
```

#### lineage list

List all columns with lineage summary for a model:

```bash
interlace lineage list MODEL [OPTIONS]
```

### migrate

Run database migrations:

```bash
interlace migrate [OPTIONS]
```

| Option                | Description                          |
| --------------------- | ------------------------------------ |
| `--env ENV`           | Environment                          |
| `--migration FILE`    | Run a specific migration             |
| `--dry-run`           | Show what would be executed          |
| `--list`              | List pending and executed migrations |

Migrations are `.sql` files in the `migrations/` directory, executed in filename order. Execution state is tracked in the `interlace.migration_runs` table.

### promote

Promote data between environments:

```bash
interlace promote [MODELS...] [OPTIONS]
```

| Option                | Description                                    |
| --------------------- | ---------------------------------------------- |
| `MODELS`              | Specific models to promote (optional)          |
| `--from ENV`          | Source environment                              |
| `--to ENV`            | Target environment                              |
| `--sources-only`      | Only promote source models                     |
| `--all`               | Promote all models                             |
| `--dry-run`           | Show what would be promoted                    |
| `--connection CONN`   | Target connection name                          |

### config

Manage configuration:

```bash
interlace config [OPTIONS]
```

| Option       | Description                          |
| ------------ | ------------------------------------ |
| `--env ENV`  | Environment                          |

### ui

Launch or manage the embedded web UI:

```bash
interlace ui [OPTIONS]
```
