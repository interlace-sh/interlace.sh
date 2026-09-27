<script lang="ts">
	import { StrategyDiagram, StrategyLegend } from '$lib/components/docs';
	import { strategyPanels } from '$lib/docs/strategy-panels';
</script>

<section class="section" id="strategies">
	<div class="container-lg strategies-inner">
		<div class="section-header">
			<p class="section-label">Strategies</p>
			<h2 class="section-title">Seven ways to land a result</h2>
			<p class="section-description">
				Every strategy is the same contract — given a query and a target, emit the SQL statements
				that reconcile them, atomically. Nine panels for seven strategies: <code>scd</code> and
				<code>incremental</code> each change behaviour enough with one extra key to be worth showing twice.
				The same scenario throughout, so only the outcome differs.
			</p>
		</div>

		<StrategyLegend />

		<div class="grid">
			{#snippet diagram(panel: (typeof strategyPanels)[number])}
				<StrategyDiagram
					name={panel.name}
					qualifier={panel.qualifier}
					blurb={panel.blurb}
					sourceLabel={panel.sourceLabel}
					source={panel.source}
					sourceDivider={panel.sourceDivider}
					before={panel.before}
					after={panel.after}
					sql={panel.sql}
					note={panel.note}
					caution={panel.caution}
				/>
			{/snippet}
			{#each strategyPanels as panel (panel.id)}
				{#if panel.solo}
					<div class="solo">{@render diagram(panel)}</div>
				{:else}
					{@render diagram(panel)}
				{/if}
			{/each}
		</div>

		<p class="more">
			<a href="/docs/core-concepts/strategies"
				>Every strategy in depth — the SQL each one emits, the engine fallbacks, and when to reach
				for which →</a
			>
		</p>
	</div>
</section>

<style>
	/* Two up, with the odd seventh centred on its own row.

	   Wider than the section header on purpose: at the standard 1200px a
	   half-width panel is ~560px, which is under the point where the three
	   panes stop fitting side by side — and stacking them loses the
	   source → before → after reading order that the panel exists to show. */
	.grid {
		@apply mt-6 grid gap-5;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		max-width: 1400px;
		margin-inline: auto;
	}

	/* The panel carries its own vertical margin for prose use; in a grid the
	   gap does that job, so drop it or the rows drift apart. */
	.grid > :global(figure) {
		margin-block: 0;
	}

	/* The odd ninth gets a centred row of its own, so the scd and incremental
	   pairs stay side by side — comparing them is why they are both here. */
	.solo {
		grid-column: 1 / -1;
		display: flex;
		justify-content: center;
	}

	.solo > :global(figure) {
		width: calc(50% - 0.625rem);
		margin-block: 0;
	}

	/* Below this the three panes inside a half-width panel get too cramped. */
	@media (max-width: 1100px) {
		.grid {
			grid-template-columns: 1fr;
		}

		.solo > :global(figure) {
			width: 100%;
		}
	}

	/* Let the grid exceed the container it sits in, without affecting the
	   header or the footer link. */
	.strategies-inner {
		max-width: 1400px;
	}

	.strategies-inner :global(.section-header) {
		max-width: 720px;
		margin-inline: auto;
	}

	.more {
		@apply mt-8 text-center text-sm;
	}

	.more a {
		color: var(--accent);
		text-decoration: none;
	}

	.more a:hover {
		color: var(--accent-light);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
