<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowLeft, ArrowRight } from '@lucide/svelte';

	interface PageLink {
		href: string;
		label: string;
	}

	const allPages: PageLink[] = [
		{ href: '/docs/getting-started', label: 'Introduction' },
		{ href: '/docs/getting-started/installation', label: 'Installation' },
		{ href: '/docs/getting-started/first-model', label: 'First Model' },
		{ href: '/docs/core-concepts', label: 'Core Concepts' },
		{ href: '/docs/core-concepts/models', label: 'Models' },
		{ href: '/docs/core-concepts/dependencies', label: 'Dependencies' },
		{ href: '/docs/core-concepts/materialization', label: 'Materialization' },
		{ href: '/docs/core-concepts/strategies', label: 'Strategies' },
		{ href: '/docs/guides', label: 'Guides' },
		{ href: '/docs/guides/sql-models', label: 'SQL Models' },
		{ href: '/docs/guides/python-models', label: 'Python Models' },
		{ href: '/docs/guides/connections', label: 'Connections' },
		{ href: '/docs/guides/environments', label: 'Environments' },
		{ href: '/docs/guides/multi-backend', label: 'Multi-Backend' },
		{ href: '/docs/guides/testing', label: 'Testing' },
		{ href: '/docs/guides/backfill', label: 'Backfill' },
		{ href: '/docs/guides/streaming', label: 'Streaming' },
		{ href: '/docs/guides/quality-checks', label: 'Quality Checks' },
		{ href: '/docs/guides/schema-evolution', label: 'Schema Evolution' },
		{ href: '/docs/guides/rest-api', label: 'REST API & Service' },
		{ href: '/docs/reference', label: 'Reference' },
		{ href: '/docs/reference/cli', label: 'CLI' },
		{ href: '/docs/reference/configuration', label: 'Configuration' },
		{ href: '/docs/reference/api', label: 'API' }
	];

	const currentIndex = $derived(allPages.findIndex((p) => p.href === $page.url.pathname));
	const prev = $derived(currentIndex > 0 ? allPages[currentIndex - 1] : null);
	const next = $derived(currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null);
</script>

{#if prev || next}
	<nav class="pagination">
		{#if prev}
			<a href={prev.href} class="pagination-link pagination-prev">
				<ArrowLeft size={14} />
				<div>
					<span class="pagination-label">Previous</span>
					<span class="pagination-title">{prev.label}</span>
				</div>
			</a>
		{:else}
			<div></div>
		{/if}

		{#if next}
			<a href={next.href} class="pagination-link pagination-next">
				<div>
					<span class="pagination-label">Next</span>
					<span class="pagination-title">{next.label}</span>
				</div>
				<ArrowRight size={14} />
			</a>
		{/if}
	</nav>
{/if}

<style>
	.pagination {
		@apply mt-12 flex items-stretch justify-between gap-4 border-t pt-6;
		border-color: var(--border);
	}

	.pagination-link {
		@apply flex items-center gap-3 rounded-lg px-4 py-3;
		color: var(--text-secondary);
		transition: all 150ms ease;
	}

	.pagination-link:hover {
		color: var(--text-primary);
		background: var(--surface);
	}

	.pagination-next {
		@apply ml-auto text-right;
	}

	.pagination-label {
		@apply block text-xs;
		color: var(--text-tertiary);
	}

	.pagination-title {
		@apply block text-sm font-medium;
	}
</style>
