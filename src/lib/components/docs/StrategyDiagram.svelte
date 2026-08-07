<script lang="ts">
	/**
	 * One strategy, shown as source → target-before → target-after with a
	 * per-row verdict. Every panel uses the same scenario so they stay
	 * comparable: row 1 changed in source, row 2 is unchanged, row 3 exists
	 * only in the target, row 4 is new in source.
	 */
	type Tag = 'ins' | 'upd' | 'del' | 'kept' | 'skip' | 'closed' | 'unread';

	type Row = {
		id: string;
		val: string;
		/** Right-aligned detail: a timestamp, a hash, a validity window. */
		meta?: string;
		tag?: Tag;
	};

	type Props = {
		name: string;
		/** Small-caps note beside the name, e.g. 'type 2 · keeps history'. */
		qualifier?: string;
		blurb: string;
		sourceLabel?: string;
		source: Row[];
		/** A dashed rule inside the source column, e.g. a window bound. */
		sourceDivider?: { after: number; label: string };
		before: Row[];
		after: Row[];
		sql: string;
		note?: string;
		/** Render the note as a caution rather than a plain aside. */
		caution?: boolean;
	};

	let {
		name,
		qualifier,
		blurb,
		sourceLabel = 'source',
		source,
		sourceDivider,
		before,
		after,
		sql,
		note,
		caution = false
	}: Props = $props();

	const TAG_TEXT: Record<Tag, string> = {
		ins: '+ ins',
		upd: '~ upd',
		del: '− del',
		kept: '· kept',
		skip: '= skip',
		closed: '× closed',
		unread: 'not read'
	};
</script>

{#snippet rowList(list: Row[])}
	{#each list as row, i (row.id + '-' + row.val + '-' + i)}
		<div class="row {row.tag ? `t-${row.tag}` : ''}">
			<span class="row-id">{row.id}</span>
			<span class="row-val">{row.val}</span>
			{#if row.meta}<span class="row-meta">{row.meta}</span>{/if}
			{#if row.tag}<span class="tag tag-{row.tag}">{TAG_TEXT[row.tag]}</span>{/if}
		</div>
	{/each}
{/snippet}

<figure class="strategy">
	<figcaption class="head">
		<span class="name">{name}</span>
		{#if qualifier}<span class="qualifier">{qualifier}</span>{/if}
	</figcaption>
	<p class="blurb">{blurb}</p>

	<div class="panes">
		<div class="pane">
			<div class="pane-label">{sourceLabel}</div>
			{#if sourceDivider}
				{@render rowList(source.slice(0, sourceDivider.after))}
				<div class="divider"><span>{sourceDivider.label}</span></div>
				{@render rowList(source.slice(sourceDivider.after))}
			{:else}
				{@render rowList(source)}
			{/if}
		</div>

		<div class="arrow" aria-hidden="true">▸</div>

		<div class="pane">
			<div class="pane-label">target · before</div>
			{@render rowList(before)}
		</div>

		<div class="arrow" aria-hidden="true">▸</div>

		<div class="pane">
			<div class="pane-label">target · after</div>
			{@render rowList(after)}
		</div>
	</div>

	<div class="sql"><span class="sql-prompt">$</span><span>{sql}</span></div>
	{#if note}<p class="note" class:caution>{note}</p>{/if}
</figure>

<style>
	.strategy {
		@apply my-6 rounded-lg p-5;
		margin-inline: 0;
		background: var(--background-secondary);
		border: 1px solid var(--border);
		/* The panes stack on the panel's own width, not the viewport's, so a
		   half-width panel in a grid behaves the same as a narrow screen. */
		container-type: inline-size;
	}

	.head {
		@apply flex flex-wrap items-center gap-3;
	}

	.name {
		@apply rounded px-2 py-0.5 text-sm font-bold;
		font-family: var(--font-mono);
		color: var(--plane-owned);
		background: color-mix(in srgb, var(--plane-owned) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--plane-owned) 25%, transparent);
	}

	.qualifier {
		@apply text-xs tracking-widest uppercase;
		color: var(--text-quaternary);
	}

	.blurb {
		@apply mt-2 mb-4 text-sm;
		color: var(--text-secondary);
		line-height: 1.55;
	}

	.panes {
		@apply flex items-stretch gap-3;
	}

	.pane {
		@apply flex min-w-0 flex-1 flex-col gap-1.5;
	}

	.pane-label {
		@apply mb-0.5 text-[10px] tracking-widest uppercase;
		color: var(--text-quaternary);
	}

	.arrow {
		@apply flex items-center;
		color: var(--text-quaternary);
	}

	.row {
		@apply flex items-center gap-2 rounded px-2 py-1 text-xs;
		font-family: var(--font-mono);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-primary);
	}

	.row-id {
		color: var(--text-quaternary);
	}

	.row-val {
		@apply truncate;
	}

	.row-meta {
		@apply ml-auto shrink-0 text-[11px];
		color: var(--text-tertiary);
	}

	.tag {
		@apply ml-auto shrink-0 rounded px-1.5 text-[10px];
		font-family: var(--font-mono);
	}

	/* The tag names the verdict; the row tint repeats it so a scan works too. */
	.t-ins {
		border-color: color-mix(in srgb, var(--diff-add-text) 40%, transparent);
		background: var(--diff-add-bg);
	}
	.tag-ins {
		color: var(--diff-add-text);
		background: var(--diff-add-bg);
	}

	.t-del {
		border-style: dashed;
		border-color: color-mix(in srgb, var(--diff-del-text) 40%, transparent);
		background: var(--diff-del-bg);
	}
	.t-del .row-val,
	.t-del .row-id {
		text-decoration: line-through;
		color: var(--text-tertiary);
	}
	.tag-del {
		color: var(--diff-del-text);
		background: var(--diff-del-bg);
	}

	.t-upd {
		border-color: color-mix(in srgb, var(--plane-terminal) 40%, transparent);
		background: color-mix(in srgb, var(--plane-terminal) 9%, transparent);
	}
	.tag-upd {
		color: var(--plane-terminal);
		background: color-mix(in srgb, var(--plane-terminal) 12%, transparent);
	}

	.t-closed {
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
		background: color-mix(in srgb, var(--accent) 9%, transparent);
	}
	.tag-closed {
		color: var(--accent-light);
		background: color-mix(in srgb, var(--accent) 14%, transparent);
	}

	/* kept / skip / unread all mean "nothing happened" — quiet, not coloured. */
	.t-kept,
	.t-skip {
		background: transparent;
	}
	.t-unread {
		background: transparent;
		border-style: dashed;
		opacity: 0.6;
	}
	.tag-kept,
	.tag-skip,
	.tag-unread {
		color: var(--text-quaternary);
	}

	.divider {
		@apply relative my-1 text-center text-[10px];
		color: var(--accent-light);
		border-top: 1px dashed color-mix(in srgb, var(--accent) 45%, transparent);
	}

	.divider span {
		@apply px-2;
		background: var(--background-secondary);
		position: relative;
		top: -0.6em;
		font-family: var(--font-mono);
	}

	.sql {
		@apply mt-4 flex gap-2 overflow-x-auto rounded px-3 py-2 text-xs;
		font-family: var(--font-mono);
		background: var(--background-tertiary);
		color: var(--text-secondary);
		white-space: pre;
	}

	.sql-prompt {
		color: var(--text-quaternary);
	}

	.note {
		@apply mt-3 mb-0 text-xs;
		color: var(--text-tertiary);
		line-height: 1.55;
	}

	.note.caution::before {
		content: '⚠ ';
		color: var(--plane-terminal);
	}

	/* Measured against the panel's content box. Below this the three panes
	   cannot hold a row like "1 A′  06-01  + ins" without truncating it. */
	@container (max-width: 560px) {
		.panes {
			@apply flex-col;
		}
		.arrow {
			@apply hidden;
		}
	}
</style>
