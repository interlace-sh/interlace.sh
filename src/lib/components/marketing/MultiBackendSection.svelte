<script lang="ts">
	import { Database } from '@lucide/svelte';
</script>

<section class="section" id="multi-backend">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Multi-Engine</p>
			<h2 class="section-title">One codebase, named engines</h2>
			<p class="section-description">
				Models run on named engines and pin to one with <code>engine:</code>. Beyond those,
				<code>attach:</code> mounts external databases onto the warehouse — readable in any SQL model
				and writable through export sinks.
			</p>
		</div>

		<div class="backends-grid">
			{#each [{ name: 'DuckDB + DuckLake', desc: 'Stable. Default engine and storage: Parquet with a SQL catalog', primary: true }, { name: 'Postgres', desc: 'Stable. Strategies execute inside Postgres over ADBC', primary: true }, { name: 'quack', desc: 'Stable. A warehouse served over the quack protocol, shared between processes', primary: true }, { name: 'Spark', desc: 'Beta. SQL runs in Spark, Arrow both ways; needs a Delta or Iceberg catalog', primary: false }, { name: 'Snowflake · BigQuery', desc: 'Alpha. Full strategy set over ADBC, including scd', primary: false }, { name: 'Redshift · MotherDuck', desc: 'Alpha. Redshift reuses the Postgres wire; MotherDuck is cloud DuckDB', primary: false }] as backend (backend.name)}
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

		<p class="backends-note">
			Separately from engines, <code>attach:</code> mounts Postgres, MySQL or SQLite onto the warehouse
			to read from or deliver into. An attached table is not a model, so it never appears in lineage and
			changing it rebuilds nothing.
		</p>
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

	.backends-note {
		@apply mx-auto mt-6 max-w-2xl text-center text-xs;
		color: var(--text-tertiary);
	}
</style>
