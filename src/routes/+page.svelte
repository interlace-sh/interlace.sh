<script lang="ts">
	import {
		Hero,
		GraphSection,
		PlanesSection,
		StrategiesSection,
		PlanApplySection,
		OneProcessSection,
		CTA
	} from '$lib/components/marketing';
	import { Seo } from '$lib/components/layout';
</script>

<Seo
	title="Interlace — SQL and Python in one graph"
	description="Python and SQL models are the same kind of node in one DAG. Transformation, orchestration and durable streaming in one process, on DuckDB and Postgres."
/>

<Hero />

<section class="section explorer-section">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">One graph</p>
			<h2 class="section-title">A Python model in the hot path</h2>
			<p class="section-description">
				Ten models over 25 million rows, from the benchmark project. Click any node to see its
				source — <code>user_ltv.py</code> sits between two SQL models, and nothing around it acknowledges
				the difference.
			</p>
		</div>
		<GraphSection />
	</div>
</section>

<PlanesSection />
<StrategiesSection />
<PlanApplySection />
<OneProcessSection />
<CTA />

<style>
	.explorer-section {
		padding-top: 0;
	}
</style>
