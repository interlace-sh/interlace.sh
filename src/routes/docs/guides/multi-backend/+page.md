---
title: Multi-Backend Connections
---

# Multi-Backend Connections

Interlace supports multiple database backends through ibis and DuckDB's federation capabilities. DuckDB and PostgreSQL are first-class backends with dedicated connection classes. Additional backends (Snowflake, BigQuery, MySQL, ClickHouse, etc.) are available via the ibis generic connection -- install the relevant ibis extra and configure in YAML.

## Supported Backends

### Native ibis Backends

Any ibis-supported backend can be used as a direct connection. Install the required extra and configure:

| Backend    | Install Command                            | Use Case                          |
| ---------- | ------------------------------------------ | --------------------------------- |
| DuckDB     | Built-in                                   | Local analytics, development      |
| PostgreSQL | Built-in                                   | OLTP source, production warehouse |
| MySQL      | `pip install 'ibis-framework[mysql]'`      | Legacy OLTP sources               |
| SQLite     | `pip install 'ibis-framework[sqlite]'`     | Embedded, testing                 |
| Snowflake  | `pip install 'ibis-framework[snowflake]'`  | Cloud warehouse                   |
| BigQuery   | `pip install 'ibis-framework[bigquery]'`   | GCP warehouse                     |
| Databricks | `pip install 'ibis-framework[databricks]'` | Spark-based lakehouse             |
| ClickHouse | `pip install 'ibis-framework[clickhouse]'` | Real-time analytics               |
| Trino      | `pip install 'ibis-framework[trino]'`      | Federated queries                 |
| MSSQL      | `pip install 'ibis-framework[mssql]'`      | Enterprise                        |
| Oracle     | `pip install 'ibis-framework[oracle]'`     | Enterprise                        |
| DataFusion | `pip install 'ibis-framework[datafusion]'` | Rust-native engine                |
| Polars     | `pip install 'ibis-framework[polars]'`     | In-process DataFrame              |
| DeltaLake  | `pip install 'ibis-framework[deltalake]'`  | Delta tables                      |
| Flink      | `pip install 'ibis-framework[flink]'`      | Streaming                         |
| RisingWave | `pip install 'ibis-framework[risingwave]'` | Streaming SQL                     |

### DuckDB ATTACH (Federation)

DuckDB can ATTACH external databases and query them as if they were local tables. This enables cross-database JOINs:

| ATTACH Type | Read | Write | Use Case                                |
| ----------- | ---- | ----- | --------------------------------------- |
| DuckDB      | Yes  | Yes   | Cross-file queries, environment sharing |
| PostgreSQL  | Yes  | Yes   | Read from OLTP, write results           |
| MySQL       | Yes  | Yes   | Legacy system integration               |
| SQLite      | Yes  | Yes   | Embedded databases                      |
| DuckLake    | Yes  | Yes   | Lakehouse with time travel              |

## Configuration Examples

### Snowflake

```yaml
connections:
  snowflake_wh:
    type: snowflake
    config:
      account: myorg-myaccount
      user: ${SNOWFLAKE_USER}
      password: ${SNOWFLAKE_PASSWORD}
      database: ANALYTICS
      schema: PUBLIC
      warehouse: COMPUTE_WH
```

### BigQuery

```yaml
connections:
  bigquery_prod:
    type: bigquery
    config:
      project_id: my-gcp-project
      dataset_id: analytics
      credentials_path: ${GOOGLE_APPLICATION_CREDENTIALS}
```

### MySQL

```yaml
connections:
  mysql_source:
    type: mysql
    config:
      host: mysql.internal
      port: 3306
      user: reader
      password: ${MYSQL_PASSWORD}
      database: app_production
```

### ClickHouse

```yaml
connections:
  clickhouse_events:
    type: clickhouse
    config:
      host: clickhouse.internal
      port: 8123
      database: events
      user: ${CLICKHOUSE_USER}
      password: ${CLICKHOUSE_PASSWORD}
```

## DuckDB ATTACH Configuration

ATTACH external databases to your DuckDB connection for federated queries:

```yaml
connections:
  default:
    type: duckdb
    path: 'data/main.duckdb'
    attach:
      # Attach a Postgres database
      - name: app_db
        type: postgres
        read_only: true
        config:
          host: ${APP_DB_HOST}
          port: 5432
          user: ${APP_DB_USER}
          password: ${APP_DB_PASSWORD}
          database: app_production

      # Attach a MySQL database
      - name: legacy_db
        type: mysql
        read_only: true
        config:
          host: mysql.internal
          port: 3306
          user: reader
          password: ${MYSQL_PASSWORD}
          database: legacy_system

      # Attach another DuckDB file (e.g., shared sources)
      - name: sources
        type: duckdb
        path: 'data/sources.duckdb'
        read_only: true

      # Attach a SQLite database
      - name: sqlite_data
        type: sqlite
        path: 'data/local.sqlite'
        read_only: true
```

### Cross-Database Queries

With ATTACH, you can query across databases in a single SQL statement:

```python
from interlace import model
from interlace.core.context import get_connection

@model(name="enriched_orders")
def enriched_orders(orders: ibis.Table) -> ibis.Table:
    conn = get_connection()

    # Query attached Postgres database
    customers = conn.connection.sql(
        "SELECT * FROM app_db.public.customers"
    )

    return orders.join(customers, orders.customer_id == customers.id)
```

## DuckLake Integration

DuckLake is a lakehouse format that stores data as Parquet files with a SQL-based metadata catalog. It provides:

- **Time travel** -- query data at any point in time
- **Schema evolution** -- automatic schema change tracking
- **Snapshots** -- named versions for reproducibility
- **S3 storage** -- data stored as Parquet on object storage

### DuckLake Configuration

```yaml
connections:
  default:
    type: duckdb
    path: 'data/main.duckdb'
    attach:
      - name: lakehouse
        type: ducklake
        catalog: 'postgres:postgresql://${CATALOG_HOST}/ducklake'
        data_path: 's3://data-lake/interlace/'
        read_only: true
```

### Time Travel Queries

```sql
-- Query data as of a specific timestamp
SELECT * FROM lakehouse.main.transactions
AT (TIMESTAMP '2026-01-15 00:00:00')
```

## When to Use Which Approach

### Use Native ibis Backend When:

- You need to **materialise results** directly in the target database
- The backend is your **primary warehouse** (Snowflake, BigQuery)
- You need **backend-specific features** (Snowflake stages, BigQuery ML)

### Use DuckDB ATTACH When:

- You need **cross-database JOINs** in a single query
- You want to **read from OLTP** databases without separate ETL
- You're using the **shared source layer** pattern for environments
- You want DuckLake **time travel** for reproducible development

### Combine Both:

```yaml
connections:
  # Native ibis -- materialise final outputs here
  snowflake_wh:
    type: snowflake
    config:
      account: myorg
      database: ANALYTICS

  # DuckDB with ATTACH -- for development and federation
  default:
    type: duckdb
    path: 'data/{env}/main.duckdb'
    attach:
      - name: app_db
        type: postgres
        read_only: true
        config:
          host: prod-db.internal
          database: app_production
```

Models that target `snowflake_wh` materialise directly in Snowflake. Models using `default` can query the attached Postgres in development, then switch connections for production.
