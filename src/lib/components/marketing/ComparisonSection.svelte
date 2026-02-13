<script lang="ts">
	import { Check, X, Minus } from '@lucide/svelte';

	type Support = 'yes' | 'no' | 'partial';

	interface Row {
		feature: string;
		interlace: Support;
		dbt: Support;
		dagster: Support;
		sqlmesh: Support;
	}

	const rows: Row[] = [
		{ feature: 'Python models', interlace: 'yes', dbt: 'partial', dagster: 'yes', sqlmesh: 'yes' },
		{ feature: 'SQL models', interlace: 'yes', dbt: 'yes', dagster: 'partial', sqlmesh: 'yes' },
		{ feature: 'Unified abstraction', interlace: 'yes', dbt: 'no', dagster: 'no', sqlmesh: 'partial' },
		{ feature: 'Built-in orchestration', interlace: 'yes', dbt: 'no', dagster: 'yes', sqlmesh: 'yes' },
		{ feature: 'Column-level lineage', interlace: 'yes', dbt: 'partial', dagster: 'partial', sqlmesh: 'yes' },
		{ feature: 'Change detection', interlace: 'yes', dbt: 'no', dagster: 'no', sqlmesh: 'yes' },
		{ feature: 'Multi-backend', interlace: 'yes', dbt: 'yes', dagster: 'yes', sqlmesh: 'partial' },
		{ feature: 'Web UI', interlace: 'yes', dbt: 'partial', dagster: 'yes', sqlmesh: 'yes' },
		{ feature: 'Zero config start', interlace: 'yes', dbt: 'partial', dagster: 'no', sqlmesh: 'partial' }
	];
</script>

<section class="section" id="comparison">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Comparison</p>
			<h2 class="section-title">How Interlace compares</h2>
			<p class="section-description">
				See how Interlace stacks up against other popular data pipeline frameworks.
			</p>
		</div>

		<div class="section-card table-wrapper">
			<table class="comparison-table">
				<thead>
					<tr>
						<th>Feature</th>
						<th class="interlace-col">Interlace</th>
						<th>dbt</th>
						<th>Dagster</th>
						<th>SQLMesh</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.feature)}
						<tr>
							<td class="feature-name">{row.feature}</td>
							{#each ['interlace', 'dbt', 'dagster', 'sqlmesh'] as tool (tool)}
								<td class="support-cell">
									{#if row[tool as keyof Row] === 'yes'}
										<Check size={16} class="icon-yes" />
									{:else if row[tool as keyof Row] === 'no'}
										<X size={16} class="icon-no" />
									{:else}
										<Minus size={16} class="icon-partial" />
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>

<style>
	.table-wrapper {
		@apply overflow-x-auto;
	}

	.interlace-col {
		color: var(--accent) !important;
	}

	.feature-name {
		@apply text-sm font-medium;
		color: var(--text-primary);
	}

	.support-cell {
		@apply text-center;
	}

	:global(.icon-yes) {
		color: var(--success);
		display: inline-block;
	}

	:global(.icon-no) {
		color: var(--text-quaternary);
		display: inline-block;
	}

	:global(.icon-partial) {
		color: var(--warning);
		display: inline-block;
	}
</style>
