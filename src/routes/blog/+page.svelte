<script lang="ts">
	import { BlogCard } from '$lib/components/blog';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
		{#each data.posts as post (post.slug)}
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
