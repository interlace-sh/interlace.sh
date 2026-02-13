<script lang="ts">
	import { Eye, Activity, Clock } from '@lucide/svelte';

	const features = [
		{
			icon: Eye,
			title: 'Column-level lineage',
			description: 'Track data flow from source to destination at the column level. Understand the impact of changes before you make them.'
		},
		{
			icon: Activity,
			title: 'Real-time monitoring',
			description: 'Watch pipeline execution in real-time via the web UI. See model status, timing, and row counts as they happen.'
		},
		{
			icon: Clock,
			title: 'Run history',
			description: 'Full execution history with timing, row counts, and error details. Debug issues quickly with complete context.'
		}
	];
</script>

<section class="section" id="observability">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Observability</p>
			<h2 class="section-title">See everything, miss nothing</h2>
			<p class="section-description">
				Built-in lineage tracking, real-time monitoring, and execution history give you full
				visibility into your data pipelines.
			</p>
		</div>

		<div class="features-grid">
			{#each features as feature (feature.title)}
				<div class="feature-card">
					<div class="feature-icon">
						<feature.icon size={20} color="var(--accent)" />
					</div>
					<h3 class="feature-title">{feature.title}</h3>
					<p class="feature-description">{feature.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.features-grid {
		@apply grid gap-6 md:grid-cols-3;
	}

	.feature-icon {
		@apply mb-4 flex h-10 w-10 items-center justify-center rounded-lg;
		background: var(--accent-dim);
	}

	.feature-title {
		@apply mb-2 text-base font-semibold;
		color: var(--text-primary);
	}

	.feature-description {
		@apply text-sm;
		color: var(--text-secondary);
	}
</style>
