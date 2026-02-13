<script lang="ts">
	const currentYear = new Date().getFullYear();

	const links = {
		product: [
			{ href: '/features', label: 'Features' },
			{ href: '/solutions', label: 'Solutions' },
			{ href: '/docs', label: 'Documentation' },
			{ href: '/blog', label: 'Blog' }
		],
		resources: [
			{ href: '/docs/getting-started', label: 'Getting Started' },
			{ href: '/docs/guides', label: 'Guides' },
			{ href: '/docs/reference', label: 'API Reference' }
		],
		community: [
			{ href: 'https://github.com/interlace-sh/interlace', label: 'GitHub', external: true },
			{ href: 'https://github.com/interlace-sh/interlace/issues', label: 'Issues', external: true }
		]
	};
</script>

<footer class="footer">
	<div class="container-lg">
		<div class="footer-grid">
			<div class="footer-brand">
				<img src="/logo-dark.svg" alt="Interlace" class="footer-logo" />
				<p class="footer-tagline">The unified data pipeline framework for Python and SQL.</p>
			</div>

			<div class="footer-links-group">
				<h3 class="footer-heading">Product</h3>
				{#each links.product as link (link.href)}
					<a href={link.href} class="footer-link">{link.label}</a>
				{/each}
			</div>

			<div class="footer-links-group">
				<h3 class="footer-heading">Resources</h3>
				{#each links.resources as link (link.href)}
					<a href={link.href} class="footer-link">{link.label}</a>
				{/each}
			</div>

			<div class="footer-links-group">
				<h3 class="footer-heading">Community</h3>
				{#each links.community as link (link.href)}
					<a href={link.href} class="footer-link" target="_blank" rel="noopener">{link.label}</a>
				{/each}
			</div>
		</div>

		<div class="footer-bottom">
			<p class="footer-copyright">&copy; {currentYear} Interlace. All rights reserved.</p>
		</div>
	</div>
</footer>

<style>
	.footer {
		@apply border-t py-12 md:py-16;
		border-color: var(--border);
		background: var(--background-secondary);
	}

	.footer-grid {
		@apply grid gap-8 sm:grid-cols-2 lg:grid-cols-4;
	}

	.footer-brand {
		@apply space-y-3;
	}

	.footer-logo {
		@apply h-6;
	}

	.footer-tagline {
		@apply text-sm;
		color: var(--text-tertiary);
	}

	.footer-links-group {
		@apply flex flex-col gap-2;
	}

	.footer-heading {
		@apply mb-2 text-xs font-semibold tracking-wider uppercase;
		color: var(--text-primary);
	}

	.footer-link {
		@apply text-sm;
		color: var(--text-tertiary);
		transition: color 150ms ease;
	}

	.footer-link:hover {
		color: var(--text-primary);
	}

	.footer-bottom {
		@apply mt-12 border-t pt-6;
		border-color: var(--border);
	}

	.footer-copyright {
		@apply text-xs;
		color: var(--text-quaternary);
	}
</style>
