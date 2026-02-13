<script lang="ts">
	import { Container } from '$lib/components/layout';
	import { DocsSidebar, DocsTableOfContents, DocsPagination } from '$lib/components/docs';

	let { children } = $props();
</script>

<svelte:head>
	<title>Documentation - Interlace</title>
</svelte:head>

<div class="docs-page">
	<Container class="docs-container">
		<div class="docs-layout">
			<!-- Left Sidebar (hidden on mobile, shown via Header mobile menu) -->
			<aside class="sidebar">
				<DocsSidebar />
			</aside>

			<!-- Main Content -->
			<main class="main-content">
				<article class="prose">
					{@render children()}
				</article>
				<DocsPagination />
			</main>

			<!-- Right TOC (hidden on mobile) -->
			<aside class="toc-sidebar">
				<DocsTableOfContents />
			</aside>
		</div>
	</Container>
</div>

<style>
	.docs-page {
		@apply min-h-screen;
	}

	:global(.docs-container) {
		@apply py-8 md:py-12;
	}

	.docs-layout {
		@apply flex gap-8 lg:gap-12;
	}

	/* Sidebar - desktop only, mobile handled by Header */
	.sidebar {
		@apply hidden lg:block;
		@apply lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)] lg:w-56 lg:px-3 lg:py-2;
		@apply shrink-0 self-start overflow-y-auto;
		border-right: 1px solid var(--border);
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.sidebar::-webkit-scrollbar {
		width: 4px;
	}

	.sidebar::-webkit-scrollbar-track {
		background: transparent;
	}

	.sidebar::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 2px;
	}

	.sidebar::-webkit-scrollbar-thumb:hover {
		background: var(--border-hover);
	}

	/* Main Content */
	.main-content {
		@apply max-w-3xl min-w-0 flex-1;
	}

	/* TOC Sidebar */
	.toc-sidebar {
		@apply hidden xl:sticky xl:top-16 xl:block xl:max-h-[calc(100vh-4rem)];
		@apply w-48 shrink-0 self-start overflow-y-auto;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.toc-sidebar::-webkit-scrollbar {
		width: 4px;
	}

	.toc-sidebar::-webkit-scrollbar-track {
		background: transparent;
	}

	.toc-sidebar::-webkit-scrollbar-thumb {
		background: var(--border);
		border-radius: 2px;
	}

	.toc-sidebar::-webkit-scrollbar-thumb:hover {
		background: var(--border-hover);
	}
</style>
