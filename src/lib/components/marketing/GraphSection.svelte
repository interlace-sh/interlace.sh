<script lang="ts">
	import { Maximize2, X } from '@lucide/svelte';
	import ModelExplorer from './ModelExplorer.svelte';

	// Expanding re-proportions the two columns rather than opening a modal, so
	// the graph and the model it belongs to stay on screen together. The
	// explorer drops its source panel and keeps the node chain — the code moves
	// aside instead of disappearing.
	let expanded = $state(false);

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && expanded) expanded = false;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="graph" class:graph-expanded={expanded}>
	<div class="graph-explorer">
		<ModelExplorer compact={expanded} />
	</div>

	<div class="graph-lineage">
		{#if expanded}
			<figure class="lineage-open">
				<div class="lineage-bar">
					<span>interlace lineage — column-level</span>
					<button
						class="lineage-close"
						onclick={() => (expanded = false)}
						aria-label="Close lineage"
					>
						<X size={14} />
					</button>
				</div>
				<img
					src="/screenshots/ui-lineage-columns.webp"
					alt="The Interlace web UI lineage canvas, showing every model in the graph expanded to its columns with one column traced through the pipeline"
					width="1534"
					height="1043"
				/>
				<figcaption>
					Every model in the graph, expanded to its columns. Click a column and the UI traces it
					through every downstream model that derives from it.
				</figcaption>
			</figure>
		{:else}
			<button class="lineage-thumb" onclick={() => (expanded = true)}>
				<span class="thumb-frame">
					<img
						src="/screenshots/ui-lineage-columns.webp"
						alt=""
						width="1534"
						height="1043"
						loading="lazy"
					/>
					<span class="thumb-scrim"></span>
				</span>
				<span class="thumb-cta">
					<Maximize2 size={14} />
					View lineage
				</span>
				<span class="thumb-note">Column-level, for the same graph</span>
			</button>
		{/if}
	</div>
</div>

<style>
	.graph {
		@apply grid items-start gap-4;
		grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
		transition: grid-template-columns 450ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.graph-expanded {
		grid-template-columns: minmax(0, 0.62fr) minmax(0, 2fr);
	}

	/* ---- thumbnail ---- */
	.lineage-thumb {
		@apply flex w-full cursor-pointer flex-col overflow-hidden rounded-xl p-0 text-left;
		border: 1px solid var(--border);
		background: var(--background-secondary);
		transition: border-color 150ms ease;
	}

	.lineage-thumb:hover {
		border-color: var(--accent);
	}

	.thumb-frame {
		@apply relative block overflow-hidden;
		aspect-ratio: 4 / 3;
		border-bottom: 1px solid var(--border);
	}

	/* Zoomed onto the node cluster: at native scale the whole UI chrome shows
	   and the graph is unreadable at thumbnail size. */
	.thumb-frame img {
		@apply block h-full w-full;
		object-fit: cover;
		object-position: 72% 46%;
		transform: scale(1.9);
		transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.lineage-thumb:hover .thumb-frame img {
		transform: scale(2);
	}

	.thumb-scrim {
		@apply pointer-events-none absolute inset-0;
		background: linear-gradient(
			to bottom,
			transparent 45%,
			color-mix(in srgb, var(--background-secondary) 82%, transparent)
		);
	}

	.thumb-cta {
		@apply flex items-center gap-2 px-4 pt-3 text-sm font-semibold;
		color: var(--accent);
	}

	.thumb-note {
		@apply px-4 pt-1 pb-4 font-mono text-xs;
		color: var(--text-quaternary);
	}

	/* ---- expanded ---- */
	.lineage-open {
		@apply m-0 overflow-hidden rounded-xl;
		border: 1px solid var(--border);
		background: var(--background-secondary);
	}

	.lineage-bar {
		@apply flex items-center gap-2 px-4 py-2.5 font-mono text-xs;
		border-bottom: 1px solid var(--border);
		color: var(--text-quaternary);
	}

	.lineage-close {
		@apply ml-auto flex cursor-pointer items-center rounded p-1;
		border: 1px solid var(--border);
		background: none;
		color: var(--text-secondary);
	}

	.lineage-close:hover {
		color: var(--text-primary);
		border-color: var(--text-primary);
	}

	.lineage-open img {
		@apply block h-auto w-full;
	}

	.lineage-open figcaption {
		@apply px-4 py-3 text-xs;
		border-top: 1px solid var(--border);
		color: var(--text-secondary);
		line-height: 1.6;
	}

	:is(.lineage-thumb, .lineage-close):focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	/* Stacked on narrow screens: expanding only grows the image, since there is
	   no second column for the code to move into. */
	@media (max-width: 900px) {
		.graph,
		.graph-expanded {
			grid-template-columns: minmax(0, 1fr);
		}

		.thumb-frame {
			aspect-ratio: 16 / 9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.graph,
		.thumb-frame img {
			transition: none;
		}
	}
</style>
