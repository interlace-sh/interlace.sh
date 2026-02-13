<script lang="ts">
	import { slide } from 'svelte/transition';
	import {
		Code2,
		GitBranch,
		RefreshCw,
		Wind,
		Download,
		Snowflake,
		Workflow,
		ChevronDown,
		Check,
		Minus,
		Layers
	} from '@lucide/svelte';

	import type { Component } from 'svelte';

	type Support = 'yes' | 'no' | 'partial';

	interface Feature {
		name: string;
		support: Support;
		note?: string;
	}

	interface Product {
		id: string;
		name: string;
		icon: Component;
		category: string;
		tagline: string;
		description: string;
		strengths: string[];
		limitations: string[];
		interlaceDifference: string;
		features: Feature[];
	}

	const products: Product[] = [
		{
			id: 'dbt',
			name: 'dbt',
			icon: Code2,
			category: 'Transformation',
			tagline: 'The SQL transformation standard',
			description:
				'dbt pioneered the analytics engineering workflow with SQL-based transformations and a massive open-source ecosystem. It remains the most widely adopted transformation tool in the modern data stack.',
			strengths: [
				'Massive ecosystem with thousands of packages and adapters',
				'Industry-standard SQL-based transformation workflow',
				'Strong community and extensive documentation',
				'Mature testing and documentation framework'
			],
			limitations: [
				'Python model support is limited (dbt Cloud only for full support)',
				'Requires an external orchestrator for production scheduling',
				'No built-in column-level lineage tracking',
				'Change detection requires dbt Cloud or third-party tooling'
			],
			interlaceDifference:
				'Interlace treats Python and SQL as equal citizens in a single DAG with built-in orchestration, column-level lineage, and change detection — no external tooling required.',
			features: [
				{ name: 'SQL models', support: 'yes' },
				{ name: 'Python models', support: 'partial', note: 'dbt Cloud only' },
				{ name: 'Built-in orchestration', support: 'no' },
				{ name: 'Column-level lineage', support: 'partial', note: 'dbt Cloud only' },
				{ name: 'Change detection', support: 'no' },
				{ name: 'Multi-backend support', support: 'yes' },
				{ name: 'Web UI', support: 'partial', note: 'dbt Cloud only' },
				{ name: 'Zero config start', support: 'partial' }
			]
		},
		{
			id: 'dagster',
			name: 'Dagster',
			icon: GitBranch,
			category: 'Orchestration',
			tagline: 'Data-aware orchestration platform',
			description:
				'Dagster is a modern orchestration platform built around software-defined assets and strong typing. It offers an excellent developer experience with a rich UI and first-class support for testing.',
			strengths: [
				'Software-defined assets with strong typing and metadata',
				'Excellent developer experience and local development workflow',
				'Rich built-in UI with asset lineage visualization',
				'First-class testing support and modular architecture'
			],
			limitations: [
				'Steep learning curve with multiple abstraction layers',
				'SQL support is secondary to Python',
				'Heavier infrastructure requirements for production deployment',
				'Asset-centric model can feel over-engineered for simple pipelines'
			],
			interlaceDifference:
				'Interlace provides a simpler model abstraction that unifies Python and SQL without requiring separate concepts for assets, ops, jobs, and resources.',
			features: [
				{ name: 'SQL models', support: 'partial', note: 'Via embedded ELT' },
				{ name: 'Python models', support: 'yes' },
				{ name: 'Built-in orchestration', support: 'yes' },
				{ name: 'Column-level lineage', support: 'partial' },
				{ name: 'Change detection', support: 'no' },
				{ name: 'Multi-backend support', support: 'yes' },
				{ name: 'Web UI', support: 'yes' },
				{ name: 'Zero config start', support: 'no' }
			]
		},
		{
			id: 'sqlmesh',
			name: 'SQLMesh',
			icon: RefreshCw,
			category: 'Transformation',
			tagline: 'Next-gen SQL transformation with virtual environments',
			description:
				'SQLMesh brings intelligent change detection, virtual environments, and plan/apply workflows to SQL transformations. It offers strong correctness guarantees and efficient incremental processing.',
			strengths: [
				'Excellent change detection and incremental processing',
				'Virtual environments for safe schema changes',
				'Built-in column-level lineage',
				'Plan/apply workflow with automatic change categorization'
			],
			limitations: [
				'SQL-first — Python model support is more limited',
				'Smaller community and ecosystem compared to dbt',
				'Fewer third-party integrations and adapters',
				'No built-in cron scheduling — requires an external scheduler for production',
				'Backend support is narrower than ibis-based tools'
			],
			interlaceDifference:
				'Interlace shares SQLMesh\'s focus on correctness but adds full Python model support via ibis, enabling polyglot pipelines across a wider range of backends.',
			features: [
				{ name: 'SQL models', support: 'yes' },
				{ name: 'Python models', support: 'yes' },
				{ name: 'Built-in orchestration', support: 'partial', note: 'Plan/apply only, no cron scheduling' },
				{ name: 'Column-level lineage', support: 'yes' },
				{ name: 'Change detection', support: 'yes' },
				{ name: 'Multi-backend support', support: 'partial', note: 'Growing list' },
				{ name: 'Web UI', support: 'yes' },
				{ name: 'Zero config start', support: 'partial' }
			]
		},
		{
			id: 'airflow',
			name: 'Apache Airflow',
			icon: Wind,
			category: 'Orchestration',
			tagline: 'Battle-tested workflow orchestration',
			description:
				'Apache Airflow is the most widely deployed workflow orchestration platform, powering production pipelines at thousands of companies. Its DAG-based scheduling model and extensive operator ecosystem are proven at scale.',
			strengths: [
				'Battle-tested at massive scale across industries',
				'Enormous ecosystem of operators and providers',
				'Flexible scheduling with complex dependency management',
				'Strong community backed by the Apache Foundation'
			],
			limitations: [
				'Not data-aware — orchestrates tasks, not data assets',
				'Heavy infrastructure requirements (scheduler, webserver, database)',
				'DAG authoring can be verbose and error-prone',
				'No built-in transformation semantics or lineage'
			],
			interlaceDifference:
				'Interlace is data-aware by design — models declare their inputs and outputs, enabling automatic lineage, change detection, and smarter scheduling without Airflow\'s infrastructure overhead.',
			features: [
				{ name: 'SQL models', support: 'no' },
				{ name: 'Python models', support: 'partial', note: 'Task-based, not model-based' },
				{ name: 'Built-in orchestration', support: 'yes' },
				{ name: 'Column-level lineage', support: 'no' },
				{ name: 'Change detection', support: 'no' },
				{ name: 'Multi-backend support', support: 'partial', note: 'Via operators' },
				{ name: 'Web UI', support: 'yes' },
				{ name: 'Zero config start', support: 'no' }
			]
		},
		{
			id: 'dlt',
			name: 'dlt (dlthub)',
			icon: Download,
			category: 'Ingestion',
			tagline: 'Python-first data loading',
			description:
				'dlt is an open-source Python library for data loading that makes it easy to create and maintain data pipelines. It handles schema inference, incremental loading, and normalization automatically.',
			strengths: [
				'Excellent Python-native EL (extract-load) experience',
				'Automatic schema inference and evolution',
				'Built-in incremental loading and state management',
				'Lightweight — runs anywhere Python runs'
			],
			limitations: [
				'Focused on ingestion, not transformation or orchestration',
				'Requires a separate tool for downstream modeling',
				'Smaller ecosystem compared to Airbyte or Fivetran',
				'Less suited for complex multi-step transformations'
			],
			interlaceDifference:
				'dlt and Interlace are complementary — use dlt for ingestion and Interlace for transformation and orchestration. They work well together in a lightweight, Python-native stack.',
			features: [
				{ name: 'Data ingestion', support: 'yes' },
				{ name: 'Schema inference', support: 'yes' },
				{ name: 'Incremental loading', support: 'yes' },
				{ name: 'Transformation', support: 'no' },
				{ name: 'Orchestration', support: 'no' },
				{ name: 'Multi-backend support', support: 'yes' },
				{ name: 'Web UI', support: 'no' },
				{ name: 'Zero config start', support: 'yes' }
			]
		},
		{
			id: 'snowflake',
			name: 'Snowflake',
			icon: Snowflake,
			category: 'Data Warehouse',
			tagline: 'Enterprise cloud data platform',
			description:
				'Snowflake is a cloud-native data platform offering storage, compute, and analytics at enterprise scale. Its separation of storage and compute and near-zero maintenance make it a popular choice for data warehousing.',
			strengths: [
				'Elastic compute with separation of storage and compute',
				'Near-zero administration and maintenance',
				'Strong SQL support with semi-structured data handling',
				'Enterprise security, governance, and data sharing'
			],
			limitations: [
				'Proprietary and usage-based pricing can be expensive',
				'Vendor lock-in for compute and storage',
				'Python support via Snowpark is growing but still maturing',
				'Not a transformation framework — requires external tooling'
			],
			interlaceDifference:
				'Interlace targets Snowflake as a backend via ibis — write transformations once and run them on Snowflake or any other supported backend. Interlace is not a replacement for Snowflake, but a layer on top.',
			features: [
				{ name: 'SQL execution', support: 'yes' },
				{ name: 'Python execution', support: 'partial', note: 'Via Snowpark' },
				{ name: 'Built-in orchestration', support: 'partial', note: 'Tasks & Streams' },
				{ name: 'Column-level lineage', support: 'partial', note: 'Enterprise only' },
				{ name: 'Change detection', support: 'partial', note: 'Streams' },
				{ name: 'Multi-backend support', support: 'no' },
				{ name: 'Web UI', support: 'yes' },
				{ name: 'Zero config start', support: 'no' }
			]
		},
		{
			id: 'prefect',
			name: 'Prefect',
			icon: Workflow,
			category: 'Orchestration',
			tagline: 'Modern workflow orchestration',
			description:
				'Prefect offers a modern, Pythonic approach to workflow orchestration with minimal boilerplate. Its hybrid execution model and dynamic workflows make it flexible for a wide range of use cases.',
			strengths: [
				'Clean, Pythonic API with minimal boilerplate',
				'Hybrid execution model (local + cloud)',
				'Dynamic task generation and flexible workflows',
				'Built-in retry, caching, and observability'
			],
			limitations: [
				'General-purpose — no data-specific awareness',
				'No built-in transformation semantics or modeling',
				'Cloud features require Prefect Cloud subscription',
				'Smaller ecosystem than Airflow for production integrations'
			],
			interlaceDifference:
				'Interlace provides data-aware orchestration where models declare their schema and dependencies, enabling automatic lineage and change detection that general-purpose orchestrators like Prefect don\'t offer.',
			features: [
				{ name: 'SQL models', support: 'no' },
				{ name: 'Python models', support: 'partial', note: 'Task-based, not model-based' },
				{ name: 'Built-in orchestration', support: 'yes' },
				{ name: 'Column-level lineage', support: 'no' },
				{ name: 'Change detection', support: 'no' },
				{ name: 'Multi-backend support', support: 'partial', note: 'Via integrations' },
				{ name: 'Web UI', support: 'yes', note: 'Prefect Cloud' },
				{ name: 'Zero config start', support: 'yes' }
			]
		}
	];

	let openCards = $state(new Set<string>());

	function toggle(id: string) {
		const next = new Set(openCards);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		openCards = next;
	}
</script>

<section class="section" id="comparison">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Comparison</p>
			<h2 class="section-title">How Interlace compares</h2>
			<p class="section-description">
				An honest look at how Interlace fits alongside the tools you already know. Every product
				has strengths — here's where each one shines and where Interlace takes a different approach.
			</p>
		</div>

		<div class="comparison-cards">
			{#each products as product (product.id)}
				{@const isOpen = openCards.has(product.id)}
				<div class="accordion-item">
					<button
						class="accordion-trigger"
						aria-expanded={isOpen}
						onclick={() => toggle(product.id)}
					>
						<div class="product-header">
							<div class="product-icon-wrapper">
								<product.icon size={20} color="var(--accent)" />
							</div>
							<div class="product-info">
								<div class="product-name-row">
									<span class="product-name">{product.name}</span>
									<span class="badge-outline">{product.category}</span>
								</div>
								<span class="product-tagline">{product.tagline}</span>
							</div>
						</div>
						<ChevronDown
							size={18}
							class="accordion-chevron {isOpen ? 'rotated' : ''}"
						/>
					</button>

					{#if isOpen}
						<div class="accordion-content" transition:slide={{ duration: 200 }}>
							<p class="product-description">{product.description}</p>

							<div class="comparison-columns">
								<div class="comparison-col">
									<h4 class="col-heading col-heading-strengths">Strengths</h4>
									<ul class="col-list">
										{#each product.strengths as strength}
											<li class="col-list-item">
												<Check size={14} class="icon-yes" />
												<span>{strength}</span>
											</li>
										{/each}
									</ul>
								</div>
								<div class="comparison-col">
									<h4 class="col-heading col-heading-limitations">Limitations</h4>
									<ul class="col-list">
										{#each product.limitations as limitation}
											<li class="col-list-item">
												<Minus size={14} class="icon-partial" />
												<span>{limitation}</span>
											</li>
										{/each}
									</ul>
								</div>
							</div>

							<div class="interlace-callout">
								<div class="callout-icon">
									<Layers size={16} color="var(--accent)" />
								</div>
								<div>
									<h4 class="callout-heading">How Interlace differs</h4>
									<p class="callout-text">{product.interlaceDifference}</p>
								</div>
							</div>

							<div class="checklist">
								<h4 class="checklist-heading">Feature comparison</h4>
								{#each product.features as feature}
									<div class="checklist-row">
										<div class="checklist-icon">
											{#if feature.support === 'yes'}
												<Check size={14} class="icon-yes" />
											{:else if feature.support === 'no'}
												<Minus size={14} class="icon-no" />
											{:else}
												<Minus size={14} class="icon-partial" />
											{/if}
										</div>
										<span class="checklist-name">{feature.name}</span>
										{#if feature.note}
											<span class="checklist-note">{feature.note}</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.comparison-cards {
		@apply flex flex-col gap-2;
	}

	.product-header {
		@apply flex items-center gap-3;
	}

	.product-icon-wrapper {
		@apply flex h-10 w-10 shrink-0 items-center justify-center rounded-lg;
		background: var(--accent-dim);
	}

	.product-info {
		@apply flex flex-col items-start gap-0.5;
	}

	.product-name-row {
		@apply flex items-center gap-2;
	}

	.product-name {
		@apply text-base font-semibold;
		color: var(--text-primary);
	}

	.product-tagline {
		@apply text-sm;
		color: var(--text-tertiary);
	}

	:global(.accordion-chevron) {
		color: var(--text-quaternary);
		transition: transform 200ms ease;
		flex-shrink: 0;
	}

	:global(.accordion-chevron.rotated) {
		transform: rotate(180deg);
	}

	.product-description {
		@apply mb-6 text-sm leading-relaxed;
		color: var(--text-secondary);
	}

	.comparison-columns {
		@apply mb-6 grid gap-6;
		grid-template-columns: 1fr 1fr;
	}

	@media (max-width: 640px) {
		.comparison-columns {
			grid-template-columns: 1fr;
		}
	}

	.col-heading {
		@apply mb-3 text-sm font-semibold;
	}

	.col-heading-strengths {
		color: var(--success);
	}

	.col-heading-limitations {
		color: var(--warning);
	}

	.col-list {
		@apply flex flex-col gap-2;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.col-list-item {
		@apply flex items-start gap-2 text-sm;
		color: var(--text-secondary);
	}

	.col-list-item :global(svg) {
		@apply mt-0.5 shrink-0;
	}

	.interlace-callout {
		@apply mb-6 flex gap-3 rounded-lg p-4;
		background: var(--accent-dimmer);
		border: 1px solid var(--accent-dim);
	}

	.callout-icon {
		@apply mt-0.5 shrink-0;
	}

	.callout-heading {
		@apply mb-1 text-sm font-semibold;
		color: var(--accent);
	}

	.callout-text {
		@apply text-sm leading-relaxed;
		color: var(--text-secondary);
	}

	.checklist {
		@apply flex flex-col gap-2;
	}

	.checklist-heading {
		@apply mb-1 text-sm font-semibold;
		color: var(--text-primary);
	}

	.checklist-row {
		@apply flex items-center gap-2 text-sm;
		color: var(--text-secondary);
	}

	.checklist-icon {
		@apply flex shrink-0 items-center;
	}

	.checklist-name {
		color: var(--text-primary);
	}

	.checklist-note {
		@apply text-xs;
		color: var(--text-tertiary);
	}

	:global(.icon-yes) {
		color: var(--success);
		display: inline-block;
	}

	:global(.icon-no) {
		color: var(--text-quaternary);
		display: inline-block;
	}

	:global(.icon-partial) {
		color: var(--warning);
		display: inline-block;
	}
</style>
