<script lang="ts">
	import './layout.css';
	import { Header, Footer } from '$lib/components/layout';

	let { children } = $props();

	const siteName = 'Interlace';
	const siteUrl = 'https://interlace.sh';
	// Leads with the wedge, not the feature list — this is the text that shows in
	// search results. Kept under ~155 chars so it isn't truncated there.
	const defaultDescription =
		'Python and SQL models are the same kind of node in one DAG. Transformation, orchestration and durable streaming in one process, on DuckDB and Postgres.';

	// JSON-LD structured data
	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Interlace',
		url: siteUrl,
		logo: `${siteUrl}/icon-512.png`,
		description: defaultDescription,
		sameAs: ['https://github.com/interlace-sh/interlace']
	};

	const softwareSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Interlace',
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Cross-platform',
		description: defaultDescription,
		url: siteUrl,
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		},
		featureList: [
			'Unified @model abstraction for Python and SQL',
			'Built-in orchestration and dependency resolution',
			'Multi-backend support (DuckDB, PostgreSQL)',
			'Incremental execution with change detection',
			'Web UI for monitoring and visualization'
		]
	};
</script>

<svelte:head>
	<!-- Icons are declared once in app.html -->

	<!--
		Only site-wide tags belong here. Everything that varies per page — title,
		description, canonical, og:*/twitter:* title, description, url and image —
		is emitted by the <Seo> component so it appears exactly once per document.
	-->
	<meta name="author" content="Interlace" />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:locale" content="en_GB" />
	<meta name="twitter:card" content="summary_large_image" />

	<!-- JSON-LD Structured Data -->
	<!-- eslint-disable svelte/no-at-html-tags -- Static JSON-LD, no user input -->
	{@html '<script type="application/ld+json">' + JSON.stringify(organizationSchema) + '</script>'}
	{@html '<script type="application/ld+json">' + JSON.stringify(softwareSchema) + '</script>'}
	<!-- eslint-enable svelte/no-at-html-tags -->
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />
</div>
