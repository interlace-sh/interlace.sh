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

		<h2 class="caveats-heading">Three things to know before you commit</h2>

		<div class="caveats">
			<div class="feature-card">
				<h3 class="caveat-title">Attached tables are not models</h3>
				<p class="caveat-text">
					You can read an attached Postgres, MySQL or SQLite table from any SQL model. Interlace
					does not track it, though: it never appears in lineage, and changing it will not make
					anything rebuild. Only models get fingerprints — an attached table is just a place to read
					from.
				</p>
			</div>
			<div class="feature-card">
				<h3 class="caveat-title">One machine</h3>
				<p class="caveat-text">
					Interlace runs as a single process, with its control plane in SQLite on local disk. There
					is no multi-node coordination and no leader election. Scaling out is designed but not
					built, so today the ceiling is the machine you run it on.
				</p>
			</div>
			<div class="feature-card">
				<h3 class="caveat-title">Help us prove the new engines</h3>
				<p class="caveat-text">
					The Spark engine is beta and the cloud adapters — MotherDuck, Redshift, Snowflake,
					BigQuery — are alpha: dialect-correct, but not yet run against a live account. If you have
					one, point Interlace at it and
					<a href="https://github.com/interlace-sh/interlace/issues" target="_blank" rel="noopener"
						>tell us what breaks</a
					>.
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
	.caveats-heading {
		@apply mt-10 mb-4 text-lg font-semibold tracking-tight;
		color: var(--text-primary);
	}

	.caveats {
		@apply grid gap-4 md:grid-cols-3;
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

	.caveat-text a {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.caveat-text a:hover {
		color: var(--accent-light);
	}

	.closing {
		@apply mx-auto mt-8 max-w-2xl text-center;
		color: var(--text-secondary);
	}
</style>
