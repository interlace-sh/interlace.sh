<script lang="ts">
	import { Container } from '$lib/components/layout';
	import { page } from '$app/stores';

	let { children } = $props();

	// Check if we're on a blog post (not the index)
	const isPost = $derived($page.url.pathname !== '/blog' && $page.url.pathname !== '/blog/');
</script>

<Container class="py-12 lg:py-16">
	{#if isPost}
		<article class="blog-post prose">
			{@render children()}
		</article>
	{:else}
		{@render children()}
	{/if}
</Container>

<style>
	.blog-post {
		@apply mx-auto max-w-3xl;
	}
</style>
