<script lang="ts">
	import { Eye, ShieldCheck, Recycle } from '@lucide/svelte';

	const features = [
		{
			icon: Eye,
			title: 'Preview every change',
			description:
				'Each model is classified as breaking, non-breaking, or forward-only before anything is built.'
		},
		{
			icon: Recycle,
			title: 'Reuse instead of rebuild',
			description:
				'Column-level impact analysis proves when a downstream output is unchanged, so its existing table is reused.'
		},
		{
			icon: ShieldCheck,
			title: 'Checks gate promotion',
			description:
				'An error-severity check failure blocks the apply before the environment view ever moves.'
		}
	];
</script>

<section class="section" id="plan-apply">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Plan / Apply</p>
			<h2 class="section-title">Terraform-style, for your warehouse</h2>
			<p class="section-description">
				See exactly what a change will do before it runs. Interlace diffs your models against the
				promoted environment, categorises the blast radius, and refuses to apply breaking changes
				unless you force them.
			</p>
		</div>

		<div class="code-block example-block">
			<div class="code-block-header">
				<span class="code-lang">Terminal</span>
				<span class="code-note">Preview before you build</span>
			</div>
			<pre><code
					><span class="comment">$ interlace plan</span>
 Model         Change    Category      Build
 orders        modified  non_breaking  rebuild
 order_stats   modified  non_breaking  reuse</code
				></pre>
		</div>

		<div class="features-grid">
			{#each features as feature (feature.title)}
				<div class="feature-card">
					<div class="feature-icon">
						<feature.icon size={20} color="var(--accent)" />
					</div>
					<h3 class="feature-title">{feature.title}</h3>
					<p class="feature-description">{feature.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.example-block {
		@apply mx-auto max-w-3xl;
	}

	.code-lang {
		@apply text-xs font-semibold;
		color: var(--accent);
	}

	.code-note {
		@apply text-xs;
		color: var(--text-tertiary);
	}

	.features-grid {
		@apply mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-3;
	}
</style>
