<script lang="ts">
	import { CTA } from '$lib/components/marketing';
	import {
		Building2,
		ShoppingCart,
		Activity,
		BarChart3,
		Users,
		Cpu,
		TrendingUp,
		Shield,
		Globe,
		Layers
	} from '@lucide/svelte';

	const useCases = [
		{
			icon: BarChart3,
			title: 'Analytics Engineering',
			description:
				'Build semantic layers and metrics stores with version-controlled transformations. Replace fragmented SQL scripts with maintainable, testable models.',
			benefits: [
				'Unified metric definitions',
				'Self-documenting transformations',
				'Automatic dependency tracking',
				'Incremental computation'
			],
			example: 'Create curated datasets for BI tools with guaranteed data freshness and lineage.'
		},
		{
			icon: TrendingUp,
			title: 'Data Warehouse Modernization',
			description:
				'Migrate from legacy ETL tools to a modern, code-first approach. Run locally on DuckDB, deploy to your production warehouse.',
			benefits: [
				'No vendor lock-in',
				'Git-based workflows',
				'Local development',
				'Gradual migration'
			],
			example: 'Replace Informatica or SSIS with Python and SQL models that run anywhere.'
		},
		{
			icon: Activity,
			title: 'Scheduled Data Products',
			description:
				'Build data products with scheduled pipelines, API-triggered runs, and automatic dependency resolution.',
			benefits: ['Cron scheduling', 'API triggers', 'Parallel execution', 'Change detection'],
			example: 'Power dashboards and analytics features with fresh, scheduled data pipelines.'
		},
		{
			icon: Users,
			title: 'Data Integration',
			description:
				'Unify data from multiple sources into consolidated views. Combine APIs, files, and databases with Python and SQL.',
			benefits: [
				'Multi-source joins',
				'Schema evolution',
				'Data quality checks',
				'Merge strategies'
			],
			example: 'Combine CRM exports, API data, and database tables into unified datasets.'
		},
		{
			icon: ShoppingCart,
			title: 'Business Analytics',
			description:
				'Build analytics pipelines that transform raw data into curated datasets for BI tools and reporting.',
			benefits: [
				'Aggregate metrics',
				'Dimensional modeling',
				'Export to CSV/Parquet',
				'Lineage tracking'
			],
			example: 'Build product analytics and reporting pipelines with full data lineage.'
		},
		{
			icon: Cpu,
			title: 'ML Feature Engineering',
			description:
				'Create reproducible feature pipelines that prepare training data with versioned, testable transformations.',
			benefits: [
				'Reproducible transforms',
				'Schema validation',
				'Export formats',
				'Ibis-powered SQL'
			],
			example: 'Build feature pipelines with consistent transformations across environments.'
		},
		{
			icon: Globe,
			title: 'API Integration Pipelines',
			description:
				'Integrate with production-only APIs (GitHub, Companies House, FCA Register) and share source data across dev/staging/prod without re-fetching.',
			benefits: [
				'Source caching with TTL',
				'Zero API calls in dev',
				'Rate limit friendly',
				'Shared source layer'
			],
			example:
				'Fetch FCA Register data weekly, cache it, and develop transformations against real data without hitting the API.'
		},
		{
			icon: Layers,
			title: 'Multi-Environment Data Platforms',
			description:
				'Build dev/staging/prod pipelines with shared source layers, zero-copy reads, and safe environment isolation.',
			benefits: [
				'Virtual environments',
				'Access policies',
				'Fallback resolution',
				'Config overlays'
			],
			example:
				'Develop locally with DuckDB reading shared sources, deploy to Snowflake in production — same models, different connections.'
		}
	];

	const industries = [
		{
			icon: Building2,
			name: 'Financial Services',
			description: 'Regulatory reporting, risk analytics, and fraud detection'
		},
		{
			icon: ShoppingCart,
			name: 'Retail & E-commerce',
			description: 'Customer analytics, inventory optimization, personalization'
		},
		{
			icon: Activity,
			name: 'Healthcare',
			description: 'Clinical analytics, patient journeys, compliance reporting'
		},
		{
			icon: Cpu,
			name: 'Technology',
			description: 'Product analytics, usage metrics, infrastructure monitoring'
		}
	];
</script>

<svelte:head>
	<title>Solutions - Interlace</title>
	<meta
		name="description"
		content="Discover how Interlace solves data challenges across analytics engineering, real-time data products, ML feature engineering, and more."
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
				Solutions
			</div>
			<h1 class="hero-title">Data solutions for every team</h1>
			<p class="hero-description">
				Whether you're building analytics infrastructure, real-time data products, or ML pipelines,
				Interlace provides the foundation you need.
			</p>
		</div>
	</div>
</section>

<!-- Use Cases -->
<section class="section bordered-section">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Use Cases</p>
			<h2 class="section-title">Built for modern data challenges</h2>
			<p class="section-description">
				From batch analytics to real-time ML features, Interlace adapts to your needs.
			</p>
		</div>

		<div class="use-cases-grid">
			{#each useCases as useCase (useCase.title)}
				<div class="section-card use-case-card">
					<div class="use-case-header">
						<div class="use-case-icon-wrapper">
							<useCase.icon size={24} color="var(--accent)" />
						</div>
						<div>
							<h3 class="use-case-title">{useCase.title}</h3>
							<p class="use-case-description">{useCase.description}</p>
						</div>
					</div>

					<div class="benefits-wrapper">
						<div class="benefits-list">
							{#each useCase.benefits as benefit (benefit)}
								<span class="badge-outline benefit-badge">{benefit}</span>
							{/each}
						</div>
					</div>

					<p class="example-box">
						<span class="example-label">Example:</span>
						{useCase.example}
					</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Industries -->
<section class="section bordered-section">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Industries</p>
			<h2 class="section-title">Built for any industry</h2>
			<p class="section-description">
				Interlace provides the foundation for data infrastructure across industries.
			</p>
		</div>

		<div class="industries-grid">
			{#each industries as industry (industry.name)}
				<div class="feature-card">
					<div class="industry-icon-wrapper">
						<industry.icon size={20} color="var(--accent)" />
					</div>
					<h3 class="industry-name">{industry.name}</h3>
					<p class="industry-description">{industry.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Architecture patterns -->
<section class="section bordered-section">
	<div class="container-lg">
		<div class="architecture-grid">
			<div>
				<p class="section-label label-left">Architecture</p>
				<h2 class="section-title title-left">Flexible deployment patterns</h2>
				<p class="architecture-description">
					Run Interlace wherever your data lives. From local development to cloud production, the
					same code runs everywhere.
				</p>

				<div class="architecture-features">
					<div class="arch-feature">
						<div class="arch-icon-wrapper">
							<Shield size={20} color="var(--accent)" />
						</div>
						<div>
							<h3 class="arch-feature-title">Your infrastructure</h3>
							<p class="arch-feature-description">
								Data never leaves your environment. Deploy on-prem or in your cloud VPC.
							</p>
						</div>
					</div>

					<div class="arch-feature">
						<div class="arch-icon-wrapper">
							<Cpu size={20} color="var(--accent)" />
						</div>
						<div>
							<h3 class="arch-feature-title">Dev to production</h3>
							<p class="arch-feature-description">
								Develop with DuckDB, deploy to PostgreSQL or other ibis-supported backends.
							</p>
						</div>
					</div>

					<div class="arch-feature">
						<div class="arch-icon-wrapper">
							<Activity size={20} color="var(--accent)" />
						</div>
						<div>
							<h3 class="arch-feature-title">Embedded analytics</h3>
							<p class="arch-feature-description">
								Build DuckDB-powered analytics directly into your applications.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Architecture diagram -->
			<div class="section-card deployment-card">
				<div class="deployment-header">
					<span class="deployment-label">Deployment Options</span>
				</div>

				<div class="deployment-options">
					<div class="deployment-option">
						<div class="deployment-option-title">Local Development</div>
						<div class="deployment-option-content">
							<code class="deployment-code code-primary">DuckDB</code>
							<span class="deployment-arrow">→</span>
							<span class="deployment-text">Zero setup, instant feedback</span>
						</div>
					</div>

					<div class="deployment-option">
						<div class="deployment-option-title">Production</div>
						<div class="deployment-option-content cloud-content">
							<code class="deployment-code code-success">PostgreSQL</code>
							<code class="deployment-code code-success">DuckDB</code>
						</div>
					</div>

					<div class="deployment-option">
						<div class="deployment-option-title">Via Ibis (additional backends)</div>
						<div class="deployment-option-content cloud-content">
							<code class="deployment-code code-secondary">Snowflake</code>
							<code class="deployment-code code-secondary">BigQuery</code>
							<code class="deployment-code code-secondary">MySQL</code>
							<code class="deployment-code code-secondary">+ more</code>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

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

	/* Sections */
	.bordered-section {
		@apply border-t;
		border-color: var(--border);
	}

	/* Use Cases */
	.use-cases-grid {
		@apply grid gap-6 md:grid-cols-2;
	}

	.use-case-card {
		@apply p-6 md:p-8;
	}

	.use-case-header {
		@apply mb-4 flex items-start gap-4;
	}

	.use-case-icon-wrapper {
		@apply flex h-12 w-12 shrink-0 items-center justify-center rounded-xl;
		background: var(--accent-dim);
	}

	.use-case-title {
		@apply mb-2 text-lg font-semibold;
		color: var(--text-primary);
	}

	.use-case-description {
		@apply text-sm;
		color: var(--text-secondary);
	}

	.benefits-wrapper {
		@apply mb-4;
	}

	.benefits-list {
		@apply flex flex-wrap gap-2;
	}

	.benefit-badge {
		@apply text-xs;
	}

	.example-box {
		@apply rounded-lg p-3 text-xs;
		background: var(--background-tertiary);
		color: var(--text-tertiary);
	}

	.example-label {
		@apply font-medium;
		color: var(--text-secondary);
	}

	/* Industries */
	.industries-grid {
		@apply grid gap-4 sm:grid-cols-2 lg:grid-cols-4;
	}

	.industry-icon-wrapper {
		@apply mb-4 flex h-10 w-10 items-center justify-center rounded-lg;
		background: var(--accent-dim);
	}

	.industry-name {
		@apply mb-2 text-base font-semibold;
		color: var(--text-primary);
	}

	.industry-description {
		@apply text-sm;
		color: var(--text-secondary);
	}

	/* Architecture */
	.architecture-grid {
		@apply grid items-center gap-12 lg:grid-cols-2;
	}

	.label-left {
		@apply text-left;
	}

	.title-left {
		@apply mb-6 text-left;
	}

	.architecture-description {
		@apply mb-8 text-base;
		color: var(--text-secondary);
	}

	.architecture-features {
		@apply space-y-6;
	}

	.arch-feature {
		@apply flex gap-4;
	}

	.arch-icon-wrapper {
		@apply flex h-10 w-10 shrink-0 items-center justify-center rounded-lg;
		background: var(--accent-dim);
	}

	.arch-feature-title {
		@apply mb-1 text-sm font-semibold;
		color: var(--text-primary);
	}

	.arch-feature-description {
		@apply text-sm;
		color: var(--text-secondary);
	}

	/* Deployment Card */
	.deployment-card {
		@apply p-6;
	}

	.deployment-header {
		@apply mb-4 flex items-center justify-between;
	}

	.deployment-label {
		@apply text-xs font-medium tracking-wider uppercase;
		color: var(--text-tertiary);
	}

	.deployment-options {
		@apply space-y-4;
	}

	.deployment-option {
		@apply rounded-lg p-4;
		background: var(--background-tertiary);
	}

	.deployment-option-title {
		@apply mb-2 text-xs font-semibold;
		color: var(--text-primary);
	}

	.deployment-option-content {
		@apply flex items-center gap-3;
	}

	.cloud-content {
		@apply flex-wrap;
	}

	.deployment-code {
		@apply rounded px-2 py-1 text-xs;
		background: var(--background);
	}

	.code-primary {
		color: var(--accent);
	}

	.code-secondary {
		color: var(--accent-secondary);
	}

	.code-success {
		color: var(--success);
	}

	.deployment-arrow {
		@apply text-xs;
		color: var(--text-tertiary);
	}

	.deployment-text {
		@apply text-xs;
		color: var(--text-secondary);
	}
</style>
