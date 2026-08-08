<script lang="ts">
	import { Seo } from '$lib/components/layout';

	/**
	 * mdsvex layout for `src/routes/blog/<slug>/+page.md`. It renders no chrome —
	 * posts already call <BlogHeader> themselves and blog/+layout.svelte supplies
	 * the article wrapper. Its only job is to turn each post's frontmatter into
	 * real per-page metadata, which is what search and link unfurls read.
	 */
	let {
		title,
		date,
		author,
		excerpt,
		children
	}: {
		title: string;
		date: string;
		author?: string;
		excerpt: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

<Seo {title} description={excerpt} type="article" published={date} {author} />

{@render children()}
