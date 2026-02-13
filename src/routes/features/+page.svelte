<script lang="ts">
	import {
		PipelinesSection,
		ObservabilitySection,
		PolyglotSection,
		IntegrationsSection,
		StreamingSection,
		ComparisonSection,
		IbisSection,
		EnvironmentsSection,
		MultiBackendSection,
		CTA
	} from '$lib/components/marketing';
	import {
		Layers,
		Code2,
		GitBranch,
		Database,
		RefreshCw,
		Eye,
		Radio,
		Shield,
		Share2
	} from '@lucide/svelte';

	const highlights = [
		{
			icon: Layers,
			title: 'Unified @model',
			description: 'One decorator for Python and SQL models'
		},
		{
			icon: Code2,
			title: 'Polyglot',
			description: 'Python via Ibis + native SQL support'
		},
		{
			icon: GitBranch,
			title: 'Orchestration',
			description: 'Built-in scheduling and DAG execution'
		},
		{
			icon: Eye,
			title: 'Lineage',
			description: 'Column-level data lineage tracking'
		},
		{
			icon: RefreshCw,
			title: 'Change Detection',
			description: 'Smart change detection and skip logic'
		},
		{
			icon: Database,
			title: 'Multi-backend',
			description: 'DuckDB, PostgreSQL, and more via Ibis'
		},
		{
			icon: Share2,
			title: 'Environments',
			description: 'Virtual environments with shared sources'
		},
		{
			icon: Radio,
			title: 'Scheduling',
			description: 'Cron, intervals, and API triggers'
		},
		{
			icon: Shield,
			title: 'Reliable',
			description: 'Retry policies and dead-letter queues'
		}
	];
</script>

<svelte:head>
	<title>Features - Interlace</title>
	<meta
		name="description"
		content="Explore Interlace features: unified @model abstraction, Python & SQL support, built-in orchestration, column-level lineage, and more."
	/>
</svelte:head>

<!-- Hero -->
<section class="hero-section">
	<div class="hero-bg bg-gradient-radial"></div>
	<div class="hero-bg bg-grid bg-grid-fade"></div>

	<div class="container-lg hero-content">
		<div class="hero-center">
			<div class="badge hero-badge">
				<span class="badge-dot"></span>
				Features
			</div>
			<h1 class="hero-title">Everything you need for production data pipelines</h1>
			<p class="hero-description">
				From development to production, Interlace provides a complete toolkit for building, testing,
				and monitoring data transformations.
			</p>
		</div>

		<!-- Feature highlights grid -->
		<div class="highlights-grid">
			{#each highlights as item (item.title)}
				<div class="feature-card highlight-card">
					<div class="highlight-icon-wrapper">
						<item.icon size={20} color="var(--accent)" />
					</div>
					<h3 class="highlight-title">{item.title}</h3>
					<p class="highlight-description">{item.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Detailed sections -->
<PolyglotSection />
<IbisSection />
<PipelinesSection />
<ObservabilitySection />
<IntegrationsSection />
<EnvironmentsSection />
<MultiBackendSection />
<StreamingSection />

<div id="comparison">
	<ComparisonSection />
</div>

<CTA />

<style>
	/* Hero Section */
	.hero-section {
		@apply relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24;
	}

	.hero-bg {
		@apply pointer-events-none absolute inset-0;
	}

	.hero-content {
		@apply relative;
	}

	.hero-center {
		@apply mx-auto max-w-3xl text-center;
	}

	.hero-badge {
		@apply mb-6;
	}

	.badge-dot {
		@apply h-1.5 w-1.5 rounded-full;
		background: var(--accent);
	}

	.hero-title {
		@apply mb-6;
	}

	.hero-description {
		@apply text-lg;
		color: var(--text-secondary);
	}

	/* Highlights Grid */
	.highlights-grid {
		@apply mt-16 grid grid-cols-2 gap-4 md:grid-cols-4;
	}

	.highlight-card {
		@apply py-6 text-center;
	}

	.highlight-icon-wrapper {
		@apply mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg;
		background: var(--accent-dim);
	}

	.highlight-title {
		@apply mb-1 text-sm font-semibold;
		color: var(--text-primary);
	}

	.highlight-description {
		@apply text-xs;
		color: var(--text-tertiary);
	}
</style>
