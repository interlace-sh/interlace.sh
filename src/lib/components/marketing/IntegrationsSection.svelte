<script lang="ts">
	import { Database, FileSpreadsheet, Globe } from '@lucide/svelte';

	const integrations = [
		{
			icon: Database,
			title: 'Database backends',
			items: ['DuckDB', 'PostgreSQL'],
			description: 'Native support with more via ibis'
		},
		{
			icon: FileSpreadsheet,
			title: 'File formats',
			items: ['CSV', 'Parquet', 'JSON'],
			description: 'Read and write natively via ibis'
		},
		{
			icon: Globe,
			title: 'Data sources',
			items: ['REST APIs', 'SFTP', 'Databases'],
			description: 'Ingest from any source with Python models'
		}
	];
</script>

<section class="section" id="integrations">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Integrations</p>
			<h2 class="section-title">Connect to your data</h2>
			<p class="section-description">
				Read from files, APIs, and databases. Write to any ibis-supported backend. Interlace handles
				the plumbing.
			</p>
		</div>

		<div class="integrations-grid">
			{#each integrations as integration (integration.title)}
				<div class="feature-card">
					<div class="integration-icon">
						<integration.icon size={20} color="var(--accent)" />
					</div>
					<h3 class="integration-title">{integration.title}</h3>
					<p class="integration-description">{integration.description}</p>
					<div class="integration-items">
						{#each integration.items as item (item)}
							<span class="badge-outline">{item}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.integrations-grid {
		@apply grid gap-6 md:grid-cols-3;
	}

	.integration-icon {
		@apply mb-4 flex h-10 w-10 items-center justify-center rounded-lg;
		background: var(--accent-dim);
	}

	.integration-title {
		@apply mb-2 text-base font-semibold;
		color: var(--text-primary);
	}

	.integration-description {
		@apply mb-4 text-sm;
		color: var(--text-secondary);
	}

	.integration-items {
		@apply flex flex-wrap gap-2;
	}
</style>
