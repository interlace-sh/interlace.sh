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
				'A unified data pipeline framework that combines the best ideas from dbt, Dagster, and SQLMesh. Define, orchestrate, and monitor transformations with a single @model decorator.'
		},
		{
			slug: 'why-unified-abstraction',
			title: 'Why We Built a Unified Abstraction',
			date: '2026-01-28',
			excerpt:
				'Data engineers spend more time managing tools than building pipelines. Here is why we built a single @model abstraction that replaces five tools with one.'
		}
	];
</script>

<svelte:head>
	<title>Blog - Interlace</title>
	<meta name="description" content="Latest news, updates, and insights from the Interlace team." />
</svelte:head>

<div class="blog-container">
	<div class="section-header">
		<h1 class="section-title">Blog</h1>
		<p class="section-description">Latest news, updates, and insights from the Interlace team.</p>
	</div>

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

	.posts-list {
		@apply space-y-6;
	}
</style>
