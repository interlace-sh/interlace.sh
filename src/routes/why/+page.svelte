<script lang="ts">
	import {
		ComparisonTable,
		ComparisonSection,
		MultiBackendSection,
		CTA
	} from '$lib/components/marketing';
</script>

<svelte:head>
	<title>Why Interlace — an honest comparison</title>
	<meta
		name="description"
		content="Where Interlace differs from dbt, SQLMesh and Airflow, and where it does not. Execution engines, external systems, and the trade-offs behind each."
	/>
	<meta property="og:title" content="Why Interlace — an honest comparison" />
	<meta name="twitter:title" content="Why Interlace — an honest comparison" />
</svelte:head>

<section class="section">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Why Interlace</p>
			<h1 class="section-title">An honest comparison</h1>
			<p class="section-description">
				Every tool here is good at what it was built for. This is where Interlace differs, and where
				it does not.
			</p>
		</div>

		<ComparisonTable />

		<div class="caveats">
			<div class="feature-card">
				<h3 class="caveat-title">The catch</h3>
				<p class="caveat-text">
					An attached table is a plain reference, <em>not a modelled dependency</em>. Interlace
					reads it, but will not rebuild anything when it changes and it will not appear in lineage.
				</p>
			</div>
			<div class="feature-card">
				<h3 class="caveat-title">Pull, not push-down</h3>
				<p class="caveat-text">
					Reading MySQL over <code>ATTACH</code> pulls data into DuckDB to transform it. A dbt adapter
					pushes the transformation down into the warehouse you already pay for.
				</p>
			</div>
			<div class="feature-card">
				<h3 class="caveat-title">Not yet proven</h3>
				<p class="caveat-text">
					The Spark engine is beta and the cloud adapters are alpha. If Snowflake or BigQuery must
					be your production execution engine today, dbt is the safer answer.
				</p>
			</div>
		</div>

		<p class="closing">
			Interlace is for teams who want transformation, orchestration and ingestion to be one
			deployable thing, on a warehouse that fits on one machine.
		</p>
	</div>
</section>

<MultiBackendSection />
<ComparisonSection />
<CTA />

<style>
	.caveats {
		@apply mt-6 grid gap-4 md:grid-cols-3;
	}

	.caveat-title {
		@apply mb-2 font-mono text-xs font-semibold tracking-widest uppercase;
		color: var(--plane-terminal);
	}

	.caveat-text {
		@apply text-sm;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.caveat-text em {
		font-style: normal;
		color: var(--text-primary);
	}

	.closing {
		@apply mx-auto mt-8 max-w-2xl text-center;
		color: var(--text-secondary);
	}
</style>
