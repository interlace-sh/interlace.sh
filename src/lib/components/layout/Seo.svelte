<script lang="ts">
	import { page } from '$app/stores';

	let {
		title,
		description,
		type = 'website',
		published,
		author,
		image
	}: {
		/** The <title>. Pages pass their own bare title; the site name is appended here. */
		title: string;
		description: string;
		type?: 'website' | 'article';
		/** ISO date, articles only. */
		published?: string;
		author?: string;
		/** Root-relative path to a per-page share image; falls back to /og.png. */
		image?: string;
	} = $props();

	const siteUrl = 'https://interlace.sh';

	const url = $derived(`${siteUrl}${$page.url.pathname.replace(/\/$/, '') || '/'}`);
	const shareImage = $derived(`${siteUrl}${image ?? '/og.png'}`);

	// Every page title ends in the site name, except the home page, whose own
	// title already leads with it.
	const fullTitle = $derived(title.startsWith('Interlace') ? title : `${title} — Interlace`);

	const articleSchema = $derived(
		type === 'article'
			? {
					'@context': 'https://schema.org',
					'@type': 'BlogPosting',
					headline: title,
					description,
					datePublished: published,
					dateModified: published,
					author: { '@type': 'Organization', name: author ?? 'Interlace' },
					publisher: {
						'@type': 'Organization',
						name: 'Interlace',
						logo: { '@type': 'ImageObject', url: `${siteUrl}/icon-512.png` }
					},
					image: shareImage,
					url,
					mainEntityOfPage: { '@type': 'WebPage', '@id': url }
				}
			: null
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />

	<link rel="canonical" href={url} />

	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content={type} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={shareImage} />

	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={shareImage} />

	{#if type === 'article' && published}
		<meta property="article:published_time" content={published} />
	{/if}

	{#if articleSchema}
		<!-- eslint-disable svelte/no-at-html-tags -- Built from own frontmatter, no user input -->
		{@html '<script type="application/ld+json">' + JSON.stringify(articleSchema) + '</script>'}
		<!-- eslint-enable svelte/no-at-html-tags -->
	{/if}
</svelte:head>
