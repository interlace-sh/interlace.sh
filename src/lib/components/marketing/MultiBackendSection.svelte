<script lang="ts">
	import { Database } from '@lucide/svelte';
</script>

<section class="section" id="multi-backend">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Multi-Backend</p>
			<h2 class="section-title">One codebase, any backend</h2>
			<p class="section-description">
				Write your models once. Interlace compiles them to the right SQL dialect for each backend via
				ibis — DuckDB for development, PostgreSQL for production.
			</p>
		</div>

		<div class="backends-grid">
			{#each [
				{ name: 'DuckDB', desc: 'Local development, embedded analytics', primary: true },
				{ name: 'PostgreSQL', desc: 'Production workloads, transactional data', primary: true },
				{ name: 'Snowflake', desc: 'Cloud data warehouse (via ibis)', primary: false },
				{ name: 'BigQuery', desc: 'Google Cloud analytics (via ibis)', primary: false },
				{ name: 'MySQL', desc: 'Web application databases (via ibis)', primary: false },
				{ name: 'SQLite', desc: 'Lightweight local storage (via ibis)', primary: false }
			] as backend (backend.name)}
				<div class="feature-card backend-card">
					<div class="backend-icon">
						<Database size={18} color={backend.primary ? 'var(--accent)' : 'var(--text-tertiary)'} />
					</div>
					<div>
						<h3 class="backend-name" class:backend-primary={backend.primary}>{backend.name}</h3>
						<p class="backend-desc">{backend.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.backends-grid {
		@apply grid gap-4 sm:grid-cols-2 lg:grid-cols-3;
	}

	.backend-card {
		@apply flex items-start gap-4;
	}

	.backend-icon {
		@apply flex h-9 w-9 shrink-0 items-center justify-center rounded-lg;
		background: var(--accent-dim);
	}

	.backend-name {
		@apply text-sm font-semibold;
		color: var(--text-primary);
	}

	.backend-primary {
		color: var(--accent);
	}

	.backend-desc {
		@apply text-xs;
		color: var(--text-secondary);
	}
</style>
