<script lang="ts">
	import { Maximize2, Minimize2 } from '@lucide/svelte';
	import ModelExplorer from './ModelExplorer.svelte';

	// Two states rather than open/closed: whichever panel you click takes the
	// room, and the other shrinks. Expanding re-proportions the columns instead
	// of opening a modal, so the graph and the model it belongs to stay on
	// screen together.
	let focus = $state<'code' | 'lineage'>('code');
	const lineageOpen = $derived(focus === 'lineage');

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && lineageOpen) focus = 'code';
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="graph" class:graph-open={lineageOpen}>
	<div class="graph-explorer">
		<ModelExplorer compact={lineageOpen} onselect={() => (focus = 'code')} />
	</div>

	<div class="graph-lineage">
		<button
			class="lineage"
			class:lineage-open={lineageOpen}
			onclick={() => (focus = lineageOpen ? 'code' : 'lineage')}
			aria-expanded={lineageOpen}
		>
			<span class="lineage-frame">
				<img
					src="/screenshots/ui-lineage-columns.webp"
					alt="The Interlace web UI lineage canvas, with every model expanded to its columns and one column traced through the pipeline"
					width="1534"
					height="1043"
					loading="lazy"
				/>
				{#if !lineageOpen}<span class="lineage-scrim"></span>{/if}
			</span>

			<span class="lineage-foot">
				<span class="lineage-cta">
					{#if lineageOpen}
						<Minimize2 size={14} />
						Hide lineage
					{:else}
						<Maximize2 size={14} />
						View lineage
					{/if}
				</span>
				<span class="lineage-note">
					{#if lineageOpen}
						Click a column in the UI and it is traced through every model that derives from it.
					{:else}
						Column-level, for the same graph
					{/if}
				</span>
			</span>
		</button>
	</div>
</div>

<style>
	.graph {
		@apply grid items-center gap-4;
		grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
		transition: grid-template-columns 450ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.graph-open {
		grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.8fr);
	}

	.lineage {
		@apply flex w-full cursor-pointer flex-col overflow-hidden rounded-xl p-0 text-left;
		border: 1px solid var(--border);
		background: var(--background-secondary);
		transition:
			border-color 150ms ease,
			box-shadow 450ms cubic-bezier(0.4, 0, 0.2, 1),
			transform 450ms cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 10px -4px rgb(0 0 0 / 0.5);
	}

	.lineage:hover {
		border-color: var(--accent);
	}

	/* Lifted off the page once it takes the room — a long, soft shadow reads as
	   depth without a literal transform. */
	.lineage-open {
		transform: translateY(-4px);
		box-shadow:
			0 30px 60px -22px rgb(0 0 0 / 0.7),
			0 12px 24px -12px rgb(0 0 0 / 0.5);
	}

	.lineage-frame {
		@apply relative block overflow-hidden;
		aspect-ratio: 4 / 3;
		border-bottom: 1px solid var(--border);
	}

	/* Zoomed onto the node cluster while small: at native scale the whole UI
	   chrome shows and the graph is unreadable at thumbnail size. */
	.lineage-frame img {
		@apply block h-full w-full;
		object-fit: cover;
		object-position: 72% 46%;
		transform: scale(1.9);
		transition: transform 450ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.lineage:hover .lineage-frame img {
		transform: scale(2);
	}

	.lineage-open .lineage-frame {
		aspect-ratio: 1534 / 1043;
	}

	.lineage-open .lineage-frame img,
	.lineage-open:hover .lineage-frame img {
		object-fit: contain;
		transform: none;
	}

	.lineage-scrim {
		@apply pointer-events-none absolute inset-0;
		background: linear-gradient(
			to bottom,
			transparent 45%,
			color-mix(in srgb, var(--background-secondary) 82%, transparent)
		);
	}

	.lineage-foot {
		@apply block px-4 pt-3 pb-4;
	}

	.lineage-cta {
		@apply flex items-center gap-2 text-sm font-semibold;
		color: var(--accent);
	}

	.lineage-note {
		@apply mt-1 block font-mono text-xs;
		color: var(--text-quaternary);
	}

	.lineage:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	/* Stacked on narrow screens: there is no second column for the code to move
	   into, so expanding only grows the image. */
	@media (max-width: 900px) {
		.graph,
		.graph-open {
			grid-template-columns: minmax(0, 1fr);
		}

		.lineage-frame {
			aspect-ratio: 16 / 9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.graph,
		.lineage,
		.lineage-frame img {
			transition: none;
		}

		.lineage-open {
			transform: none;
		}
	}
</style>
