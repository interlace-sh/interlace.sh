<section class="section" id="planes">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Materialisation</p>
			<h2 class="section-title">Two axes, not one</h2>
			<p class="section-description">
				<code>materialise</code> decides where a result lands and who owns it.
				<code>strategy</code> decides how it is written. They compose — and every combination above comes
				from one real project.
			</p>
		</div>

		<div class="planes-grid">
			<div class="feature-card">
				<div class="plane-key plane-owned">owned</div>
				<p class="plane-values">
					<code>virtual</code> · <code>view</code> · <code>ephemeral</code>
				</p>
				<p class="plane-text">
					Interlace builds an immutable fingerprinted snapshot and serves it through an environment
					view. That ownership is what makes rebuild-skip, sandboxes, atomic promotion, rollback and
					<code>gc</code> possible.
				</p>
			</div>

			<div class="feature-card">
				<div class="plane-key plane-terminal">terminal</div>
				<p class="plane-values"><code>table</code> · <code>file</code></p>
				<p class="plane-text">
					A destination Interlace does not own. It delivers into an external table or overwrites a
					file, evolves the target additively, and never drops it — so grants, indexes and RLS
					survive. Environment-gated to production by default.
				</p>
			</div>
		</div>

		<p class="planes-note">
			A breaking change cannot apply to a terminal target: there is no old version to serve during
			the build and no atomic cutover. That constraint is why the two planes exist.
		</p>
	</div>
</section>

<style>
	.planes-grid {
		@apply grid gap-4 md:grid-cols-2;
	}

	.plane-key {
		@apply mb-2 font-mono text-xs font-semibold tracking-widest uppercase;
	}

	.plane-owned {
		color: var(--plane-owned);
	}

	.plane-terminal {
		color: var(--plane-terminal);
	}

	.plane-values {
		@apply mb-3 font-mono text-sm;
		color: var(--text-primary);
	}

	.plane-text {
		@apply text-sm;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.planes-note {
		@apply mx-auto mt-6 max-w-2xl text-center text-xs;
		color: var(--text-tertiary);
	}
</style>
