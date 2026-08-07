<script lang="ts">
	// Two separate questions get two separate rows: where transforms execute,
	// and what Interlace can read from or deliver into. Collapsing them
	// understates the reach and overstates the engine list.
	type Cell = { verdict: 'yes' | 'part' | 'no'; label: string; note?: string };
	type Row = { feature: string; qualifier?: string; cells: Cell[] };

	const columns = ['Interlace', 'dbt', 'SQLMesh', 'Airflow'];

	const rows: Row[] = [
		{
			feature: 'SQL models',
			cells: [
				{ verdict: 'yes', label: 'Yes' },
				{ verdict: 'yes', label: 'Yes' },
				{ verdict: 'yes', label: 'Yes' },
				{ verdict: 'no', label: 'No', note: 'orchestration only' }
			]
		},
		{
			feature: 'Python models in the same DAG',
			cells: [
				{ verdict: 'yes', label: 'Yes', note: 'interchangeable with SQL, either direction' },
				{ verdict: 'part', label: 'Partial', note: 'platform-dependent, not freely mixable' },
				{ verdict: 'part', label: 'Partial', note: 'supported, SQL-first' },
				{ verdict: 'no', label: 'N/A' }
			]
		},
		{
			feature: 'Plan / apply with change classification',
			cells: [
				{ verdict: 'yes', label: 'Yes', note: 'column-pruned reuse' },
				{ verdict: 'no', label: 'No' },
				{ verdict: 'yes', label: 'Yes', note: 'the original of this idea' },
				{ verdict: 'no', label: 'No' }
			]
		},
		{
			feature: 'Built-in scheduling',
			cells: [
				{ verdict: 'yes', label: 'Yes', note: 'cron and interval' },
				{ verdict: 'no', label: 'No', note: 'needs an orchestrator' },
				{ verdict: 'part', label: 'Partial' },
				{ verdict: 'yes', label: 'Yes', note: 'its core strength' }
			]
		},
		{
			feature: 'Streaming ingestion',
			qualifier: 'not what these three are for — compared properly below',
			cells: [
				{ verdict: 'yes', label: 'Yes', note: 'durable log, exactly-once into the warehouse' },
				{ verdict: 'no', label: 'No' },
				{ verdict: 'no', label: 'No' },
				{ verdict: 'no', label: 'No', note: 'can trigger a loader' }
			]
		},
		{
			feature: 'Execution engines',
			qualifier: 'which backends transforms can run on',
			cells: [
				{
					verdict: 'yes',
					label: 'Comparable',
					note: 'DuckDB/DuckLake, MotherDuck, quack, Postgres, Redshift, Snowflake, BigQuery and Spark, with near-full strategy support on each. Databricks is not built'
				},
				{ verdict: 'yes', label: 'Very broad', note: 'plus a long tail of community adapters' },
				{ verdict: 'yes', label: 'Broad' },
				{ verdict: 'no', label: 'N/A' }
			]
		},
		{
			feature: 'How proven those engines are',
			qualifier: 'the honest gap',
			cells: [
				{
					verdict: 'part',
					label: 'Thin',
					note: 'only the DuckDB family and Postgres are tested in CI. Spark is beta against a local session; the four cloud warehouses are alpha — dialect-correct and unit-tested for SQL shape, but not yet run against a live account'
				},
				{ verdict: 'yes', label: 'Years of production use' },
				{ verdict: 'yes', label: 'Established' },
				{ verdict: 'yes', label: 'Years of production use' }
			]
		},
		{
			feature: 'Read and write external systems',
			qualifier: 'sources and reverse-ETL targets',
			cells: [
				{
					verdict: 'yes',
					label: 'Broad',
					note: 'Postgres, MySQL and SQLite over DuckDB ATTACH; Parquet, CSV, JSON and S3; Iceberg and Delta reads'
				},
				{ verdict: 'part', label: 'Via the warehouse' },
				{ verdict: 'part', label: 'Via the warehouse' },
				{ verdict: 'yes', label: 'Very broad', note: 'operator ecosystem' }
			]
		},
		{
			feature: 'Community and ecosystem',
			cells: [
				{
					verdict: 'no',
					label: 'What community?',
					note: 'no plugin registry, no Stack Overflow tag, no conference talks, no one to ask. You would be early'
				},
				{ verdict: 'yes', label: 'Very large' },
				{ verdict: 'part', label: 'Growing' },
				{ verdict: 'yes', label: 'Very large' }
			]
		}
	];
</script>

<div class="cmp-wrap">
	<table class="cmp">
		<thead>
			<tr>
				<th scope="col"><span class="sr">Capability</span></th>
				{#each columns as column, i (column)}
					<th scope="col" class:cmp-us={i === 0}>{column}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.feature)}
				<tr>
					<th scope="row">
						{row.feature}
						{#if row.qualifier}<span class="cmp-qualifier">{row.qualifier}</span>{/if}
					</th>
					{#each row.cells as cell, i (columns[i])}
						<td class:cmp-us={i === 0}>
							<span class="v-{cell.verdict}">{cell.label}</span>{#if cell.note}<span
									class="cmp-note">&nbsp;— {cell.note}</span
								>{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.cmp-wrap {
		@apply overflow-x-auto rounded-xl;
		border: 1px solid var(--border);
	}

	.cmp {
		@apply w-full border-collapse text-sm;
		min-width: 680px;
	}

	.sr {
		@apply sr-only;
	}

	.cmp thead th {
		@apply px-3.5 py-3 text-left font-mono text-xs font-semibold tracking-widest uppercase;
		color: var(--text-quaternary);
		border-bottom: 1px solid var(--border);
	}

	.cmp tbody th {
		@apply px-3.5 py-3 text-left align-top text-sm font-medium;
		color: var(--text-primary);
		border-bottom: 1px solid var(--border);
	}

	.cmp td {
		@apply px-3.5 py-3 align-top text-xs;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border);
		line-height: 1.55;
	}

	.cmp tbody tr:last-child :is(th, td) {
		border-bottom: 0;
	}

	.cmp-us {
		background: var(--accent-dimmer);
	}

	.cmp-qualifier {
		@apply mt-0.5 block text-xs font-normal;
		color: var(--text-quaternary);
	}

	.cmp-note {
		color: var(--text-tertiary);
	}

	.v-yes {
		color: var(--plane-owned);
	}

	.v-part {
		color: var(--plane-terminal);
	}

	.v-no {
		color: var(--text-quaternary);
	}
</style>
