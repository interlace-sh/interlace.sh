<script lang="ts">
	import { GitBranch, RefreshCw, Zap } from '@lucide/svelte';

	const features = [
		{
			icon: GitBranch,
			title: 'Automatic DAG resolution',
			description: 'Dependencies are inferred from function parameters and SQL references. No manual wiring.'
		},
		{
			icon: Zap,
			title: 'Parallel execution',
			description: 'Independent models run concurrently. Downstream models wait only for their direct dependencies.'
		},
		{
			icon: RefreshCw,
			title: 'Change detection',
			description: 'Smart change detection skips models whose inputs have not changed, reducing unnecessary work.'
		}
	];
</script>

<section class="section" id="pipelines">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Orchestration</p>
			<h2 class="section-title">Built-in pipeline orchestration</h2>
			<p class="section-description">
				No external scheduler needed. Interlace builds your DAG automatically, executes in parallel,
				and tracks state across runs.
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
