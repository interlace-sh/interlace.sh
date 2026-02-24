<script lang="ts">
	import { page } from '$app/stores';

	interface NavItem {
		href: string;
		label: string;
	}

	interface NavGroup {
		title: string;
		items: NavItem[];
	}

	const navigation: NavGroup[] = [
		{
			title: 'Getting Started',
			items: [
				{ href: '/docs/getting-started', label: 'Introduction' },
				{ href: '/docs/getting-started/installation', label: 'Installation' },
				{ href: '/docs/getting-started/first-model', label: 'First Model' }
			]
		},
		{
			title: 'Core Concepts',
			items: [
				{ href: '/docs/core-concepts', label: 'Overview' },
				{ href: '/docs/core-concepts/models', label: 'Models' },
				{ href: '/docs/core-concepts/dependencies', label: 'Dependencies' },
				{ href: '/docs/core-concepts/materialization', label: 'Materialization' },
				{ href: '/docs/core-concepts/strategies', label: 'Strategies' }
			]
		},
		{
			title: 'Guides',
			items: [
				{ href: '/docs/guides', label: 'Overview' },
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
				{ href: '/docs/guides/rest-api', label: 'REST API & Service' }
			]
		},
		{
			title: 'Reference',
			items: [
				{ href: '/docs/reference', label: 'Overview' },
				{ href: '/docs/reference/cli', label: 'CLI' },
				{ href: '/docs/reference/configuration', label: 'Configuration' },
				{ href: '/docs/reference/api', label: 'API' }
			]
		}
	];

	function isActive(href: string): boolean {
		return $page.url.pathname === href;
	}
</script>

<nav class="docs-sidebar-nav">
	{#each navigation as group (group.title)}
		<div class="nav-group">
			<h3 class="nav-group-title">{group.title}</h3>
			<ul class="nav-list">
				{#each group.items as item (item.href)}
					<li>
						<a
							href={item.href}
							class="sidebar-link"
							class:sidebar-link-active={isActive(item.href)}
						>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>

<style>
	.docs-sidebar-nav {
		@apply space-y-6;
	}

	.nav-group-title {
		@apply mb-2 text-xs font-semibold tracking-wider uppercase;
		color: var(--text-tertiary);
	}

	.nav-list {
		@apply space-y-0.5;
	}

	.sidebar-link {
		@apply block rounded-md px-2 py-1.5 text-sm;
		color: var(--text-secondary);
		transition: all 150ms ease;
	}

	.sidebar-link:hover {
		color: var(--text-primary);
		background: var(--surface);
	}

	.sidebar-link-active {
		color: var(--accent);
		background: var(--accent-dimmer);
	}
</style>
