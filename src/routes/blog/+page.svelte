<script lang="ts">
	import { BlogCard } from '$lib/components/blog';

	// Static blog posts - in a real app, this would come from a CMS or markdown files
	const posts = [
		{
			slug: 'virtual-environments',
			title: 'Virtual Environments: Sandboxes That Cost Nothing',
			date: '2026-07-31',
			excerpt:
				'An environment is not a copy of your data, it is a set of views over it. How fingerprinted tables make dev sandboxes free, promotion an atomic view swap, and rollback instant.'
		},
		{
			slug: 'introducing-interlace',
			title: 'Introducing Interlace',
			date: '2026-07-30',
			excerpt:
				'A Python/SQL-first data platform combining transformation, orchestration, and durable streaming in one process — with a terraform-style plan/apply workflow. Now at 1.0.'
		},
		{
			slug: 'why-unified-abstraction',
			title: 'Why We Built a Unified Abstraction',
			date: '2026-07-29',
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
