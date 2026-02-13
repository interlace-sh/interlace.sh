<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	// Check if we're on a blog post (not the index)
	const isPost = $derived($page.url.pathname !== '/blog' && $page.url.pathname !== '/blog/');
</script>

<section class="section blog-section">
	<div class="container-lg">
		{#if isPost}
			<article class="blog-post prose">
				{@render children()}
			</article>
		{:else}
			{@render children()}
		{/if}
	</div>
</section>

<style>
	.blog-post {
		@apply mx-auto max-w-3xl;
	}
</style>
