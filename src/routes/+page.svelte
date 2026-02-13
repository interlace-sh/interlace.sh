<script lang="ts">
	import {
		Hero,
		PipelinesSection,
		ObservabilitySection,
		PolyglotSection,
		IntegrationsSection,
		StreamingSection,
		ComparisonSection,
		CTA
	} from '$lib/components/marketing';
</script>

<svelte:head>
	<title>Interlace - The Unified Data Pipeline Framework</title>
	<meta property="og:title" content="Interlace - The Unified Data Pipeline Framework" />
	<meta name="twitter:title" content="Interlace - The Unified Data Pipeline Framework" />
</svelte:head>

<Hero />
<ComparisonSection />
<PipelinesSection />
<ObservabilitySection />
<PolyglotSection />
<IntegrationsSection />
<StreamingSection />
<CTA />
