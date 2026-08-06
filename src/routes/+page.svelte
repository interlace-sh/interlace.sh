<script lang="ts">
	import {
		Hero,
		ModelExplorer,
		PlanesSection,
		PlanApplySection,
		DaemonSection,
		OneProcessSection,
		CTA
	} from '$lib/components/marketing';
</script>

<svelte:head>
	<title>Interlace — SQL and Python in one graph</title>
	<meta
		name="description"
		content="A Python/SQL-first data platform: transformation, orchestration and durable streaming in one process. SQL and Python models are interchangeable nodes in the same DAG."
	/>
	<meta property="og:title" content="Interlace — SQL and Python in one graph" />
	<meta name="twitter:title" content="Interlace — SQL and Python in one graph" />
</svelte:head>

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
		<ModelExplorer />
	</div>
</section>

<PlanesSection />
<PlanApplySection />
<DaemonSection />
<OneProcessSection />
<CTA />

<style>
	.explorer-section {
		padding-top: 0;
	}
</style>
