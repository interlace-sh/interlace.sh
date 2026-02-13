<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
</script>

<section class="cta-section">
	<div class="cta-bg bg-gradient-radial-subtle"></div>

	<div class="container-lg cta-content">
		<div class="cta-inner">
			<h2 class="cta-title">Ready to simplify your data pipelines?</h2>
			<p class="cta-description">
				Get started with Interlace in minutes. Install, define your first model, and run.
			</p>
			<div class="cta-actions">
				<a href="/docs/getting-started" class="btn-primary">
					Get Started
					<ArrowRight size={16} />
				</a>
				<a href="https://github.com/interlace-sh/interlace" class="btn-secondary" target="_blank" rel="noopener">
					View on GitHub
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.cta-section {
		@apply relative overflow-hidden py-20 md:py-28;
		border-top: 1px solid var(--border);
	}

	.cta-bg {
		@apply pointer-events-none absolute inset-0;
	}

	.cta-content {
		@apply relative;
	}

	.cta-inner {
		@apply mx-auto max-w-2xl text-center;
	}

	.cta-title {
		@apply mb-4;
		color: var(--text-primary);
	}

	.cta-description {
		@apply mb-8 text-lg;
		color: var(--text-secondary);
	}

	.cta-actions {
		@apply flex items-center justify-center gap-4;
	}
</style>
