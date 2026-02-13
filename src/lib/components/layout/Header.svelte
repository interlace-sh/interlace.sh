<script lang="ts">
	import { page } from '$app/stores';
	import { Menu, X } from '@lucide/svelte';

	let mobileOpen = $state(false);

	const nav = [
		{ href: '/features', label: 'Features' },
		{ href: '/solutions', label: 'Solutions' },
		{ href: '/docs', label: 'Docs' },
		{ href: '/blog', label: 'Blog' }
	];

	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}
</script>

<header class="header">
	<div class="container-lg header-inner">
		<a href="/" class="logo-link">
			<img src="/logo-dark.svg" alt="Interlace" class="logo" />
		</a>

		<nav class="desktop-nav">
			{#each nav as item (item.href)}
				<a href={item.href} class="nav-link" class:nav-link-active={isActive(item.href)}>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="header-actions">
			<a href="https://github.com/interlace-sh/interlace" class="btn-secondary btn-sm" target="_blank" rel="noopener">
				GitHub
			</a>
			<button class="mobile-toggle" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Toggle menu">
				{#if mobileOpen}
					<X size={20} />
				{:else}
					<Menu size={20} />
				{/if}
			</button>
		</div>
	</div>

	{#if mobileOpen}
		<nav class="mobile-nav">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="mobile-nav-link"
					class:nav-link-active={isActive(item.href)}
					onclick={() => (mobileOpen = false)}
				>
					{item.label}
				</a>
			{/each}
			<a href="https://github.com/interlace-sh/interlace" class="mobile-nav-link" target="_blank" rel="noopener">
				GitHub
			</a>
		</nav>
	{/if}
</header>

<style>
	.header {
		@apply sticky top-0 z-50;
		background: rgba(var(--background), 0.8);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border);
	}

	.header-inner {
		@apply flex h-16 items-center justify-between;
	}

	.logo-link {
		@apply flex items-center;
	}

	.logo {
		@apply h-10;
	}

	.desktop-nav {
		@apply hidden items-center gap-1 md:flex;
	}

	.header-actions {
		@apply flex items-center gap-3;
	}

	.btn-sm {
		@apply px-3 py-1.5 text-xs;
	}

	.mobile-toggle {
		@apply flex items-center justify-center md:hidden;
		color: var(--text-secondary);
	}

	.mobile-nav {
		@apply flex flex-col gap-1 border-t px-6 py-4 md:hidden;
		border-color: var(--border);
		background: var(--background);
	}

	.mobile-nav-link {
		@apply rounded-md px-3 py-2 text-sm font-medium;
		color: var(--text-secondary);
	}

	.mobile-nav-link:hover {
		color: var(--text-primary);
		background: var(--surface);
	}
</style>
