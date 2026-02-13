<script lang="ts">
	import { BlogCard } from '$lib/components/blog';

	// Static blog posts - in a real app, this would come from a CMS or markdown files
	const posts = [
		{
			slug: 'virtual-environments',
			title: 'Virtual Environments: Share Source Data Without the Headaches',
			date: '2026-02-05',
			excerpt:
				'Fetch source data once, share it across dev/staging/prod with zero re-fetching. Introducing shared source layers, TTL caching, access policies, and 20+ backend support.'
		},
		{
			slug: 'introducing-interlace',
			title: 'Introducing Interlace',
			date: '2026-02-01',
			excerpt:
				'We are excited to announce Interlace, a unified data pipeline framework that combines the best of dbt, Dagster, and SQLMesh into a single, cohesive tool.'
		},
		{
			slug: 'why-unified-abstraction',
			title: 'Why We Built a Unified Abstraction',
			date: '2026-01-28',
			excerpt:
				'Modern data teams are drowning in tools. Here is why we believe a unified @model abstraction is the future of data engineering.'
		}
	];
</script>

<svelte:head>
	<title>Blog - Interlace</title>
	<meta name="description" content="Latest news, updates, and insights from the Interlace team." />
</svelte:head>

<div class="blog-container">
	<header class="blog-header">
		<h1 class="blog-title">Blog</h1>
		<p class="blog-subtitle">Latest news, updates, and insights from the Interlace team.</p>
	</header>

	<div class="posts-list">
		{#each posts as post (post.slug)}
			<BlogCard
				title={post.title}
				date={post.date}
				excerpt={post.excerpt}
				href="/blog/{post.slug}"
			/>
		{/each}
	</div>
</div>

<style>
	.blog-container {
		@apply mx-auto max-w-3xl;
	}

	.blog-header {
		@apply mb-12;
	}

	.blog-title {
		@apply mb-4 text-3xl font-bold md:text-4xl;
	}

	.blog-subtitle {
		@apply text-lg;
		color: var(--text-secondary);
	}

	.posts-list {
		@apply space-y-6;
	}
</style>
