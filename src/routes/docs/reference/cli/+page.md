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
| `MODELS`                   | Specific models to run (positional, optional - runs all if omitted) |
| `--env ENV`                | Environment (dev, staging, prod)                                    |
| `--verbose`, `-v`          | Enable verbose output                                               |
| `--project-dir`, `-d PATH` | Project directory (default: current)                                |
| `--force`, `-f`            | Force execution (bypass change detection)                           |

Examples:

```bash
# Run all models
interlace run

# Run specific models
interlace run users orders

# Force full refresh
interlace run --force

# Verbose output
interlace run -v
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

### init

Initialize a new project:

```bash
interlace init [DIRECTORY]
```

Creates a new Interlace project with the standard directory structure.

### Other Commands

| Command   | Description                   |
| --------- | ----------------------------- |
| `config`  | Manage configuration          |
| `schema`  | Schema management and diffing |
| `migrate` | Run database migrations       |
| `lineage` | View model lineage            |
| `plan`    | Preview execution plan        |
| `ui`      | Manage embedded web UI        |
