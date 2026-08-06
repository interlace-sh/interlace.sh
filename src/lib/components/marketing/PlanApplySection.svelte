<script lang="ts">
	import { Eye, ShieldCheck, Recycle } from '@lucide/svelte';

	// Verbatim `interlace run` output from examples/benchmark: 25M synthetic events
	// fanned out through a DAG that exercises every strategy (replace, incremental,
	// merge, full_merge, scd, append) across virtual / view / file / external table.
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
	const none: Delta = { text: '—', kind: 'none' };

	const rows: Row[] = [
		{
			model: 'events',
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: '—',
			rows: [a('+25,000,000')],
			time: '3.85s'
		},
		{
			model: 'daily_revenue',
			output: 'virtual',
			strategy: 'incremental_by_time',
			engine: 'default',
			deps: 'events',
			rows: [a('+29')],
			time: '0.28s'
		},
		{
			model: 'daily_feed',
			output: 'table',
			strategy: 'append',
			engine: 'default',
			deps: 'daily_revenue',
			rows: [a('+29')],
			time: '0.30s'
		},
		{
			model: 'revenue_report',
			output: 'file',
			strategy: 'replace',
			engine: 'default',
			deps: 'daily_revenue',
			rows: [a('+29')],
			time: '0.07s'
		},
		{
			model: 'by_day',
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'enriched',
			rows: [a('+30')],
			time: '0.08s'
		},
		{
			model: 'by_device',
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'enriched',
			rows: [a('+4')],
			time: '0.11s'
		},
		{
			model: 'by_product',
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'enriched',
			rows: [a('+15,000')],
			time: '0.21s'
		},
		{
			model: 'by_user',
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'enriched',
			rows: [a('+100,000')],
			time: '0.45s'
		},
		{
			model: 'product_catalog',
			output: 'virtual',
			strategy: 'full_merge',
			engine: 'default',
			deps: 'by_product',
			rows: [a('+15,000')],
			time: '0.34s'
		},
		{
			model: 'top_products',
			output: 'view',
			strategy: 'replace',
			engine: 'default',
			deps: 'by_product',
			rows: [none],
			time: '0.36s'
		},
		{
			model: 'user_history',
			output: 'virtual',
			strategy: 'scd',
			engine: 'default',
			deps: 'by_user',
			rows: [a('+100,000')],
			time: '0.09s'
		},
		{
			model: 'user_ltv',
			output: 'virtual',
			strategy: 'merge',
			engine: 'default',
			deps: 'by_user',
			rows: [a('+100,000')],
			time: '0.15s'
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
		dim('Checks: 2/2 passed'),
		dim("Ran 12 model(s) (12 task(s)); promoted 13 to 'prod'.")
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
				each with its own strategy, in dependency order. This is the benchmark: 25M synthetic events
				fanned out through every strategy, start to finish in seconds.
			</p>
		</div>

		<div class="code-block terminal">
			<div class="code-block-header">
				<span class="code-lang">Terminal</span>
				<span class="code-note">examples/benchmark</span>
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
