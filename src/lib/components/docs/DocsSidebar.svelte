<script lang="ts">
	import { page } from '$app/stores';
	import { docsNavigation } from '$lib/docs/nav';

	const navigation = docsNavigation().groups;

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
