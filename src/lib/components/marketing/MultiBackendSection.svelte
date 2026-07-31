<script lang="ts">
	import { Database } from '@lucide/svelte';
</script>

<section class="section" id="multi-backend">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Multi-Engine</p>
			<h2 class="section-title">One codebase, named engines</h2>
			<p class="section-description">
				Models run on named engines and pin to one with <code>engine:</code>. Strategies execute
				inside the pinned engine — no DuckDB middleman — and cross-engine dependencies appear as
				explicit transfer lines in the plan.
			</p>
		</div>

		<div class="backends-grid">
			{#each [{ name: 'DuckDB + DuckLake', desc: 'Default engine and storage: Parquet with a SQL catalog', primary: true }, { name: 'Postgres', desc: 'Native execution over ADBC (interlaced[adbc])', primary: true }, { name: 'Arrow transfers', desc: 'Cross-engine deps move as Arrow, or via a federated ATTACH fast lane', primary: false }] as backend (backend.name)}
				<div class="feature-card backend-card">
					<div class="backend-icon">
						<Database
							size={18}
							color={backend.primary ? 'var(--accent)' : 'var(--text-tertiary)'}
						/>
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
