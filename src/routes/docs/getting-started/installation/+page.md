---
title: Installation
---

# Installation

Get Interlace up and running in your environment.

## Requirements

- Python 3.10 or higher
- pip or uv package manager

## Install with pip

```bash
pip install interlace
```

## Install with uv (recommended)

```bash
uv pip install interlace
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
