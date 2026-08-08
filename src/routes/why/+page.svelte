<script lang="ts">
	import {
		ComparisonTable,
		IngestionComparison,
		MultiBackendSection,
		CTA
	} from '$lib/components/marketing';
	import { Seo } from '$lib/components/layout';
</script>

<Seo
	title="Why Interlace — an honest comparison"
	description="Where Interlace differs from dbt, SQLMesh and Airflow, and where it does not. Execution engines, external systems, and the trade-offs behind each."
/>

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

		<h2 class="caveats-heading">Where the others are stronger</h2>

		<dl class="others">
			<div>
				<dt>dbt</dt>
				<dd>
					An adapter for every warehouse and years of production mileage on all of them, plus an
					ecosystem no new tool will match for a long time.
				</dd>
			</div>
			<div>
				<dt>SQLMesh</dt>
				<dd>
					Originated plan/apply, virtual environments and the interval ledger. Interlace adopted all
					three, and SQLMesh remains the deeper SQL-first tool.
				</dd>
			</div>
			<div>
				<dt>Airflow</dt>
				<dd>
					Cross-system orchestration that reaches well outside the data platform. Interlace
					schedules its own models and nothing else.
				</dd>
			</div>
			<div>
				<dt>Dagster</dt>
				<dd>
					Software-defined assets with a richer typing and resource model. If you want one
					orchestrator spanning many teams and tools, it goes further.
				</dd>
			</div>
			<div>
				<dt>dlt</dt>
				<dd>
					Complementary rather than competing — its schema inference and connectors are excellent,
					and you can call it inside a Python model.
				</dd>
			</div>
			<div>
				<dt>Snowflake, BigQuery</dt>
				<dd>Not competitors at all. They are execution engines Interlace runs models on.</dd>
			</div>
		</dl>

		<p class="closing">
			Interlace is for teams who want transformation, orchestration and ingestion to be one
			deployable thing, on a warehouse that fits on one machine.
		</p>
	</div>
</section>

<IngestionComparison />
<MultiBackendSection />
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

	.caveat-text a {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.caveat-text a:hover {
		color: var(--accent-light);
	}

	.others {
		@apply grid gap-x-8 gap-y-5 md:grid-cols-2;
	}

	/* No uppercase transform: dbt and dlt are lowercase brands, and shouting
	   them misspells them. */
	.others dt {
		@apply mb-1 font-mono text-sm font-semibold;
		color: var(--accent);
	}

	.others dd {
		@apply m-0 text-sm;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.closing {
		@apply mx-auto mt-10 max-w-2xl text-center;
		color: var(--text-secondary);
	}
</style>
