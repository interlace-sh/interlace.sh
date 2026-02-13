<script lang="ts">
	import { Share2, Lock, Layers } from '@lucide/svelte';

	const features = [
		{
			icon: Share2,
			title: 'Shared source layer',
			description: 'Fetch source data once in production, share it across dev and staging with zero re-fetching.'
		},
		{
			icon: Lock,
			title: 'Environment isolation',
			description: 'Each environment has its own transformations and outputs while safely reading shared sources.'
		},
		{
			icon: Layers,
			title: 'Config overlays',
			description: 'Override connections, schedules, and settings per environment with simple YAML overlays.'
		}
	];
</script>

<section class="section" id="environments">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Environments</p>
			<h2 class="section-title">Virtual environments, real isolation</h2>
			<p class="section-description">
				Develop locally with DuckDB, deploy to production with PostgreSQL. Share source data across
				environments without re-fetching.
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
