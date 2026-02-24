---
title: Installation
---

# Installation

Get Interlace up and running in your environment.

## Requirements

- Python 3.12 or higher

## Install with pipx (recommended)

The recommended way to install Interlace is as a CLI tool with [pipx](https://pipx.pypa.io/):

```bash
pipx install interlace
```

This installs the `interlace` command globally in an isolated environment.

## Install in a project

If you prefer to add Interlace as a project dependency:

```bash
pip install interlace
# or
uv add interlace
```

## Verify Installation

After installation, verify everything is working:

```bash
interlace --version
```

You should see the version number printed to the console.

## Initialize a Project

Create a new Interlace project:

```bash
mkdir my-pipeline
cd my-pipeline
interlace init
```

This creates the basic project structure:

```
my-pipeline/
├── config.yaml          # Project configuration
├── models/              # Your model definitions
│   └── example.py
└── .interlace/          # Internal state (git-ignored)
```

## Next Steps

Now that Interlace is installed, [create your first model](/docs/getting-started/first-model).
