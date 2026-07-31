<script lang="ts">
	const views = [
		{
			id: 'overview',
			label: 'Overview',
			src: '/screenshots/ui-overview.webp',
			caption:
				'Pending changes, active and failed runs, stream lag and failing checks — with a live event feed over SSE.'
		},
		{
			id: 'plan',
			label: 'Plan',
			src: '/screenshots/ui-plan.webp',
			caption:
				'Every change classified before it runs. Breaking changes are flagged and apply asks before proceeding.'
		},
		{
			id: 'lineage',
			label: 'Lineage',
			src: '/screenshots/ui-lineage.webp',
			caption:
				'The full graph — streams, tables, SCD2 dimensions and reverse-ETL sinks. Click a column to trace it end to end.'
		},
		{
			id: 'streams',
			label: 'Streams',
			src: '/screenshots/ui-streams.webp',
			caption:
				'Durable append logs with their head offset and warehouse watermark. Publishes land in the log before the 200.'
		}
	];

	let active = $state(views[0]);
</script>

<section class="section" id="daemon">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">The Daemon</p>
			<h2 class="section-title">One process, everything running</h2>
			<p class="section-description">
				<code>interlace serve</code> starts the web UI, HTTP API, scheduler and stream ingestion together
				— no separate orchestrator, no extra services to deploy.
			</p>
		</div>

		<div class="viewer">
			<div class="tabs" role="tablist" aria-label="Web UI views">
				{#each views as view (view.id)}
					<button
						class="tab"
						class:tab-active={active.id === view.id}
						role="tab"
						aria-selected={active.id === view.id}
						onclick={() => (active = view)}
					>
						{view.label}
					</button>
				{/each}
			</div>

			<figure class="frame">
				<div class="chrome">
					<span class="dot dot-red"></span>
					<span class="dot dot-amber"></span>
					<span class="dot dot-green"></span>
					<span class="address">localhost:8000/ui</span>
				</div>
				<img
					src={active.src}
					alt="Interlace web UI — {active.label} view"
					width="1456"
					height="560"
				/>
				<figcaption>{active.caption}</figcaption>
			</figure>
		</div>
	</div>
</section>

<style>
	.viewer {
		@apply mx-auto max-w-5xl;
	}

	.tabs {
		@apply mb-4 flex flex-wrap justify-center gap-2;
	}

	.tab {
		@apply cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors;
		color: var(--text-secondary);
		border: 1px solid var(--border);
		background: transparent;
	}

	.tab:hover {
		color: var(--text-primary);
		border-color: var(--border-hover);
	}

	.tab-active,
	.tab-active:hover {
		color: var(--accent-foreground);
		background: var(--accent);
		border-color: var(--accent);
	}

	.frame {
		@apply overflow-hidden rounded-xl;
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.chrome {
		@apply flex items-center gap-2 px-4 py-2.5;
		border-bottom: 1px solid var(--border);
	}

	.dot {
		@apply inline-block h-2.5 w-2.5 rounded-full;
	}

	.dot-red {
		background: #ff5f57;
	}

	.dot-amber {
		background: #febc2e;
	}

	.dot-green {
		background: #28c840;
	}

	.address {
		@apply ml-2 font-mono text-xs;
		color: var(--text-tertiary);
	}

	.frame img {
		@apply block h-auto w-full;
	}

	figcaption {
		@apply px-4 py-3 text-center text-xs;
		color: var(--text-secondary);
		border-top: 1px solid var(--border);
	}
</style>
