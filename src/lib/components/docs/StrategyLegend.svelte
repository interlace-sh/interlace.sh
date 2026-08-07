<script lang="ts">
	/** Shared key for the strategy diagrams. Rendered once, above the set. */
	const ITEMS = [
		{ tag: 'ins', symbol: '+', label: 'inserted' },
		{ tag: 'upd', symbol: '~', label: 'updated' },
		{ tag: 'del', symbol: '−', label: 'deleted' },
		{ tag: 'skip', symbol: '=', label: 'skipped' },
		{ tag: 'kept', symbol: '·', label: 'untouched' },
		{ tag: 'closed', symbol: '×', label: 'closed version' }
	];
</script>

<div class="legend">
	<span class="legend-label">legend</span>
	{#each ITEMS as item (item.tag)}
		<span class="item">
			<span class="chip chip-{item.tag}">{item.symbol}</span>
			<span class="text">{item.label}</span>
		</span>
	{/each}
</div>

<p class="scenario">
	Every diagram uses the same scenario: row <b>1</b> changed in source, row <b>2</b> is unchanged,
	row <b>3</b> exists only in the target, row <b>4</b> is new in source.
</p>

<style>
	.legend {
		@apply mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-4 py-3;
		background: var(--background-secondary);
		border: 1px solid var(--border);
	}

	.legend-label {
		@apply text-[10px] tracking-widest uppercase;
		color: var(--text-quaternary);
	}

	.item {
		@apply flex items-center gap-1.5;
	}

	.chip {
		@apply rounded px-1.5 text-xs;
		font-family: var(--font-mono);
	}

	.text {
		@apply text-xs;
		color: var(--text-tertiary);
	}

	.chip-ins {
		color: var(--diff-add-text);
		background: var(--diff-add-bg);
	}
	.chip-del {
		color: var(--diff-del-text);
		background: var(--diff-del-bg);
	}
	.chip-upd {
		color: var(--plane-terminal);
		background: color-mix(in srgb, var(--plane-terminal) 12%, transparent);
	}
	.chip-closed {
		color: var(--accent-light);
		background: color-mix(in srgb, var(--accent) 14%, transparent);
	}
	.chip-skip,
	.chip-kept {
		color: var(--text-quaternary);
		background: color-mix(in srgb, var(--text-quaternary) 12%, transparent);
	}

	.scenario {
		@apply mt-3 text-sm;
		color: var(--text-tertiary);
	}

	.scenario b {
		font-family: var(--font-mono);
		color: var(--text-secondary);
		font-weight: 500;
	}
</style>
