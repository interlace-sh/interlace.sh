<script lang="ts">
	import './layout.css';
	import { Header, Footer } from '$lib/components/layout';
	import { page } from '$app/stores';

	let { children } = $props();

	const siteName = 'Interlace';
	const siteUrl = 'https://interlace.sh';
	const defaultDescription =
		'The unified data pipeline framework for Python and SQL. Build, orchestrate, and monitor data pipelines with a single @model abstraction.';
	const defaultImage = `${siteUrl}/hero-image.png`;

	// JSON-LD structured data
	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: 'Interlace',
		url: siteUrl,
		logo: `${siteUrl}/logo-dark.svg`,
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
	<!-- Favicon with light/dark mode support -->
	<link rel="icon" href="/icon.svg" />

	<!-- Default meta tags (can be overridden by child pages) -->
	<meta name="description" content={defaultDescription} />
	<meta name="author" content="Interlace" />

	<!-- Open Graph -->
	<meta property="og:site_name" content={siteName} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={`${siteUrl}${$page.url.pathname}`} />
	<meta property="og:image" content={defaultImage} />
	<meta property="og:description" content={defaultDescription} />

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={defaultImage} />
	<meta name="twitter:description" content={defaultDescription} />

	<!-- Canonical URL -->
	<link rel="canonical" href={`${siteUrl}${$page.url.pathname}`} />

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
