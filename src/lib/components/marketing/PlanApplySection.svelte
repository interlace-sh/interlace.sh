<script lang="ts">
	import { Eye, ShieldCheck, Recycle } from '@lucide/svelte';

	// Verbatim `interlace run` output from examples/materialisations, which
	// exercises every materialise x strategy pair.
	//
	// The table is assembled into a single HTML string here rather than written
	// as markup, because a <pre> is whitespace-sensitive and Prettier reformats
	// template indentation straight into the rendered output.
	//
	// Colours follow the CLI (_render_build_results): Model and Rows keep the
	// default style, every other column is dim, and row deltas are green /
	// amber / red for inserted / updated / deleted.
	type Delta = { text: string; kind: 'add' | 'upd' | 'del' | 'none' };
	type Row = {
		model: string;
		output: string;
		strategy: string;
		engine: string;
		deps: string;
		rows: Delta[];
		time: string;
	};

	const a = (text: string): Delta => ({ text, kind: 'add' });
	const d = (text: string): Delta => ({ text, kind: 'del' });

	const rows: Row[] = [
		{
			model: 'customers',
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'seed',
			rows: [a('+3')],
			time: '0.06s'
		},
		{
			model: 'accounts_full_merge',
			output: 'virtual',
			strategy: 'full_merge',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.04s'
		},
		{
			model: 'accounts_merge',
			output: 'virtual',
			strategy: 'merge',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.08s'
		},
		{
			model: 'crm_append',
			output: 'table',
			strategy: 'append',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.21s'
		},
		{
			model: 'crm_full_merge',
			output: 'table',
			strategy: 'full_merge',
			engine: 'default',
			deps: 'customers',
			rows: [d('-1')],
			time: '0.26s'
		},
		{
			model: 'crm_incremental',
			output: 'table',
			strategy: 'incremental_by_time',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3'), d('-1')],
			time: '0.09s'
		},
		{
			model: 'crm_replace',
			output: 'table',
			strategy: 'replace',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3'), d('-4')],
			time: '0.19s'
		},
		{
			model: 'crm_upsert',
			output: 'table',
			strategy: 'merge',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.20s'
		},
		{
			model: 'customer_history',
			output: 'virtual',
			strategy: 'scd',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.11s'
		},
		{
			model: 'customers_view',
			output: 'view',
			strategy: 'replace',
			engine: 'default',
			deps: 'customers',
			rows: [{ text: '—', kind: 'none' }],
			time: '0.09s'
		},
		{
			model: 'events_incremental',
			output: 'virtual',
			strategy: 'incremental_by_time',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.11s'
		},
		{
			model: 'export_csv',
			output: 'file',
			strategy: 'replace',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.05s'
		},
		{
			model: 'export_json',
			output: 'file',
			strategy: 'replace',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.04s'
		},
		{
			model: 'export_parquet',
			output: 'file',
			strategy: 'replace',
			engine: 'default',
			deps: 'customers',
			rows: [a('+3')],
			time: '0.05s'
		}
	];

	const headers = ['Model', 'Output', 'Strategy', 'Engine', 'Depends on', 'Rows', 'Time'];
	const plain = (r: Row) => [
		r.model,
		r.output,
		r.strategy,
		r.engine,
		r.deps,
		r.rows.map((p) => p.text).join(' '),
		r.time
	];

	// Widths are measured, not hand-spaced, so the table cannot fall out of
	// alignment if a name or strategy changes.
	const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => plain(r)[i].length)));
	const gap = '   ';
	const dim = (s: string) => `<span class="t-dim">${s}</span>`;

	const headerLine =
		' ' + headers.map((h, i) => (i >= 5 ? h.padStart(w[i]) : h.padEnd(w[i]))).join(gap);
	const ruleLine =
		' ' + dim('─'.repeat(w.reduce((x, y) => x + y, 0) + gap.length * (w.length - 1)));

	const bodyLines = rows.map((r) => {
		const cells = plain(r);
		const deltas = r.rows.map((p) => `<span class="t-${p.kind}">${p.text}</span>`).join(' ');
		const rowsCell = ' '.repeat(w[5] - cells[5].length) + deltas;
		return (
			' ' +
			[
				`<span class="t-model">${cells[0].padEnd(w[0])}</span>`,
				dim(cells[1].padEnd(w[1])),
				dim(cells[2].padEnd(w[2])),
				dim(cells[3].padEnd(w[3])),
				dim(cells[4].padEnd(w[4])),
				rowsCell,
				dim(cells[6].padStart(w[6]))
			].join(gap)
		);
	});

	const terminal = [
		`<span class="t-cmd">$ interlace run</span>`,
		'',
		`<span class="t-title">Build results</span>`,
		'',
		headerLine,
		ruleLine,
		...bodyLines,
		'',
		dim("Ran 14 model(s) (14 task(s)); promoted 15 to 'prod'.")
	].join('\n');

	const features = [
		{
			icon: Eye,
			title: 'Preview every change',
			description:
				'interlace plan classifies each model as breaking, non-breaking or forward-only before anything is built.'
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

<section class="section" id="build">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Build</p>
			<h2 class="section-title">One run, every plane</h2>
			<p class="section-description">
				A single command builds owned snapshots, delivers into external tables and writes files —
				each with its own strategy, in dependency order. This is the reference project that
				exercises every combination.
			</p>
		</div>

		<div class="code-block terminal">
			<div class="code-block-header">
				<span class="code-lang">Terminal</span>
				<span class="code-note">examples/materialisations</span>
			</div>
			<!-- eslint-disable svelte/no-at-html-tags -- composed above from static data -->
			<pre><code>{@html terminal}</code></pre>
			<!-- eslint-enable svelte/no-at-html-tags -->
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
	.terminal {
		@apply mx-auto max-w-4xl;
	}

	.terminal pre {
		@apply overflow-x-auto;
	}

	.code-lang {
		@apply text-xs font-semibold;
		color: var(--accent);
	}

	.code-note {
		@apply text-xs;
		color: var(--text-tertiary);
	}

	/* The CLI dims every column except Model and Rows, so the eye lands on what
	   was built and what it did to the data. */
	.terminal :global(.t-cmd) {
		color: var(--text-quaternary);
	}

	.terminal :global(.t-title) {
		font-weight: 700;
		color: var(--text-primary);
	}

	.terminal :global(.t-dim) {
		color: var(--text-tertiary);
	}

	.terminal :global(.t-model) {
		color: var(--text-primary);
	}

	.terminal :global(.t-add) {
		color: #c3e88d;
	}

	.terminal :global(.t-upd) {
		color: #ffcb6b;
	}

	.terminal :global(.t-del) {
		color: #f07178;
	}

	.terminal :global(.t-none) {
		color: var(--text-tertiary);
	}

	.features-grid {
		@apply mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-3;
	}
</style>
