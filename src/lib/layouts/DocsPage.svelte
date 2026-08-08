<script lang="ts">
	import { Seo } from '$lib/components/layout';

	/**
	 * mdsvex layout for `src/routes/docs/**\/+page.md`. Docs pages previously all
	 * shared one hardcoded <title>, so every page in the section competed with
	 * itself in search results. Title and description now come from each page's
	 * own frontmatter.
	 */
	let {
		title,
		description,
		children
	}: {
		title: string;
		description?: string;
		children: import('svelte').Snippet;
	} = $props();

	const fallback =
		'Documentation for Interlace — Python and SQL models in one DAG, with orchestration and durable streaming ingestion in a single process.';
</script>

<Seo title={`${title} — Docs`} description={description ?? fallback} />

{@render children()}
