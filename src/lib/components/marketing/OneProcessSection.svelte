<script lang="ts">
	import { Radio, Layers, Boxes, Plug } from '@lucide/svelte';

	const capabilities = [
		{
			icon: Radio,
			title: 'Durable streams',
			description:
				'POST an event and it is fsynced before the 200, deduplicated by idempotency key, and materialised exactly once — the watermark commits in the same warehouse transaction as the data.'
		},
		{
			icon: Layers,
			title: 'Free sandboxes',
			description:
				'An environment is a set of views over fingerprinted tables, so a dev environment reuses production’s for free. Promotion is an atomic view swap; rollback is the same move backwards.'
		},
		{
			icon: Boxes,
			title: 'Built-in scheduling',
			description:
				'Cron and interval triggers over a durable run queue with leases, retries and cooperative cancellation. No Airflow, no broker, no second deployment.'
		},
		{
			icon: Plug,
			title: 'Pin models to engines',
			description:
				'DuckDB/DuckLake by default, with Postgres, Snowflake, BigQuery, Redshift, MotherDuck and Spark behind an engine: pin. Cross-engine dependencies move as Arrow, or over a federated ATTACH.'
		}
	];
</script>

<section class="section" id="one-process">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">The Daemon</p>
			<h2 class="section-title">One process, not a stack</h2>
			<p class="section-description">
				<code>interlace serve</code> runs the web UI, HTTP API, scheduler and stream ingestion together.
				There is no separate orchestrator to deploy and no broker to operate.
			</p>
		</div>

		<div class="capability-grid">
			{#each capabilities as capability (capability.title)}
				<div class="feature-card">
					<div class="capability-icon">
						<capability.icon size={20} color="var(--accent)" />
					</div>
					<h3 class="capability-title">{capability.title}</h3>
					<p class="capability-description">{capability.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.capability-grid {
		@apply grid gap-4 sm:grid-cols-2;
	}

	.capability-icon {
		@apply mb-3 flex h-9 w-9 items-center justify-center rounded-lg;
		background: var(--accent-dim);
	}

	.capability-title {
		@apply mb-1.5 text-sm font-semibold;
		color: var(--text-primary);
	}

	.capability-description {
		@apply text-sm;
		color: var(--text-secondary);
		line-height: 1.6;
	}
</style>
