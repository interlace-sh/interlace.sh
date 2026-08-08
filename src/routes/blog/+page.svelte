<script lang="ts">
	import { BlogCard } from '$lib/components/blog';
	import { Seo } from '$lib/components/layout';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo
	title="Blog"
	description="Engineering write-ups on Python and SQL models in one DAG, sqlglot as an IR, durable streaming, and migrating off dbt — each with numbers and runnable commands."
/>

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
