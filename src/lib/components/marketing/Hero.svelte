<script lang="ts">
	import { ArrowRight, Terminal } from '@lucide/svelte';
</script>

<section class="hero-section">
	<div class="hero-bg bg-gradient-radial"></div>
	<div class="hero-bg bg-grid bg-grid-fade"></div>

	<div class="container-lg hero-content">
		<div class="hero-center">
			<div class="badge hero-badge">
				<span class="badge-dot"></span>
				Now in public beta
			</div>

			<h1 class="hero-title">
				<span class="gradient-text">The unified data pipeline framework</span>
			</h1>

			<p class="hero-description">
				Define, orchestrate, and monitor data transformations with a single <code>@model</code>
				abstraction. Python and SQL, one framework.
			</p>

			<div class="hero-actions">
				<a href="/docs/getting-started" class="btn-primary">
					Get Started
					<ArrowRight size={16} />
				</a>
				<a href="/features" class="btn-secondary">
					Explore Features
				</a>
			</div>

			<!-- Quick install -->
			<div class="install-block">
				<div class="install-command">
					<Terminal size={14} class="install-icon" />
					<span class="install-prompt">$</span>
					<span class="install-text">pipx install interlace</span>
				</div>
				<p class="install-alt">or <code>pip install interlace</code> / <code>uv add interlace</code> in a project</p>
			</div>
		</div>
	</div>
</section>

<style>
	.hero-section {
		@apply relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32;
	}

	.hero-bg {
		@apply pointer-events-none absolute inset-0;
	}

	.hero-content {
		@apply relative;
	}

	.hero-center {
		@apply mx-auto max-w-3xl text-center;
	}

	.hero-badge {
		@apply mb-6;
	}

	.badge-dot {
		@apply h-1.5 w-1.5 rounded-full;
		background: var(--accent);
	}

	.hero-title {
		@apply mb-6;
	}

	.hero-description {
		@apply mx-auto mb-8 max-w-2xl text-lg;
		color: var(--text-secondary);
	}

	.hero-description code {
		@apply rounded px-1.5 py-0.5 font-mono text-sm;
		background: var(--accent-dim);
		color: var(--accent);
	}

	.hero-actions {
		@apply mb-10 flex items-center justify-center gap-4;
	}

	.install-block {
		@apply mx-auto flex flex-col items-center gap-2;
	}

	.install-command {
		@apply inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-mono text-sm;
		background: var(--background-secondary);
		border: 1px solid var(--border);
	}

	:global(.install-icon) {
		color: var(--text-quaternary);
	}

	.install-prompt {
		color: var(--accent);
	}

	.install-text {
		color: var(--text-secondary);
	}

	.install-alt {
		@apply text-xs;
		color: var(--text-quaternary);
	}

	.install-alt code {
		@apply rounded px-1.5 py-0.5 font-mono text-xs;
		background: var(--accent-dim);
		color: var(--accent);
	}
</style>
