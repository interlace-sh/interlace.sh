<script lang="ts">
	import { Radio, Clock, Repeat } from '@lucide/svelte';

	const features = [
		{
			icon: Clock,
			title: 'Cron scheduling',
			description: 'Run pipelines on a schedule with built-in cron support. No external scheduler required.'
		},
		{
			icon: Radio,
			title: 'API triggers',
			description: 'Trigger pipeline runs via the REST API. Integrate with webhooks and CI/CD pipelines.'
		},
		{
			icon: Repeat,
			title: 'Incremental execution',
			description: 'Process only new or changed data with built-in incremental strategies and state tracking.'
		}
	];
</script>

<section class="section" id="scheduling">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Scheduling</p>
			<h2 class="section-title">Run on your schedule</h2>
			<p class="section-description">
				Built-in scheduling, API triggers, and incremental execution. Keep your data fresh without
				the overhead.
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
