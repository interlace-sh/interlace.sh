<script lang="ts">
	// Every model here is copied from examples/benchmark in the interlace repo —
	// a ten-model DAG over 25M synthetic rows. Between them they exercise all
	// five materialisations, with a Python model in the hot path between two
	// SQL ones. If the example changes, this should change with it.
	type Node = {
		id: string;
		ext: 'sql' | 'py';
		mat: string;
		strat: string;
		owned: boolean;
		file: string;
		lang: string;
		src: string;
		note: string;
	};

	const spine: Node[] = [
		{
			id: 'events',
			ext: 'sql',
			mat: 'virtual',
			strat: 'replace',
			owned: true,
			file: 'models/events.sql',
			lang: 'SQL',
			src: `-- 25,000,000 synthetic events, generated in-engine.
SELECT
    r AS event_id,
    hash(r) % 100000 AS user_id,
    round((hash(r + 3) % 9000) / 100.0 + 10, 2) AS amount,
    TIMESTAMP '2026-06-01' + INTERVAL (hash(r + 4) % 2592000) SECOND AS ts
FROM range(25000000) AS t (r)`,
			note: 'No header at all, so it takes the defaults: <strong>virtual</strong> and <strong>replace</strong>.'
		},
		{
			id: 'enriched',
			ext: 'sql',
			mat: 'ephemeral',
			strat: '—',
			owned: true,
			file: 'models/enriched.sql',
			lang: 'SQL',
			src: `/* interlace:
  materialise: ephemeral
*/
-- No table is built. This query is inlined as a CTE into every
-- consumer, so each branch scans the full 25M rows through it.
SELECT event_id, user_id, product_id, device, amount, ts,
       CAST(ts AS DATE) AS day,
       CASE WHEN amount >= 80 THEN 'high' ELSE 'low' END AS band
FROM events`,
			note: '<strong>ephemeral</strong> builds nothing. Owned plane, but no snapshot and no environment view — it exists only inside its consumers.'
		},
		{
			id: 'by_user',
			ext: 'sql',
			mat: 'virtual',
			strat: 'replace',
			owned: true,
			file: 'models/by_user.sql',
			lang: 'SQL',
			src: `/* interlace:
  checks:
    - row_count: {min: 90000}
*/
-- Branch 1 of 4. The four by_* models share no edges, so
-- apply builds them CONCURRENTLY.
SELECT user_id, count(*) AS events, sum(amount) AS spend, max(ts) AS last_seen
FROM enriched
GROUP BY user_id`,
			note: 'A check on the model gates promotion — an error-severity failure stops the apply before any view moves.'
		},
		{
			id: 'user_ltv',
			ext: 'py',
			mat: 'virtual',
			strat: 'merge',
			owned: true,
			file: 'models/user_ltv.py',
			lang: 'Python',
			src: `from interlace import model

@model(depends_on=["by_user"], strategy="merge", key=["user_id"])
def user_ltv(by_user):
    for batch in by_user.reader():
        score = pc.add(pc.multiply(batch.column("spend"), 0.1), batch.column("events"))
        yield pa.RecordBatch.from_arrays(
            [batch.column("user_id"), batch.column("spend"), pc.round(score, 2)],
            names=["user_id", "spend", "ltv"],
        )`,
			note: '<strong>Python, in the hot path.</strong> Its upstream is SQL. It is a generator, so 100k rows stream through Arrow with bounded memory — and <strong>merge</strong> is the same keyed upsert a SQL model gets.'
		}
	];

	const rest: Node[] = [
		{
			id: 'top_products',
			ext: 'sql',
			mat: 'view',
			strat: '—',
			owned: true,
			file: 'models/top_products.sql',
			lang: 'SQL',
			src: `/* interlace:
  materialise: view
*/
-- A view at the end of the product branch: promoted like any
-- model, zero build cost.
SELECT product_id, sum(revenue) AS revenue
FROM by_product
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 20`,
			note: '<strong>view</strong> is on the owned plane and gets an environment view like any model — it just holds no data.'
		},
		{
			id: 'daily_revenue',
			ext: 'sql',
			mat: 'virtual',
			strat: 'incremental_by_time',
			owned: true,
			file: 'models/daily_revenue.sql',
			lang: 'SQL',
			src: `/* interlace:
  strategy: incremental_by_time
  time_column: day
  interval: 1d
  checks:
    - not_null: day
*/
-- The FIRST build auto-backfills: apply derives the source's
-- time range and fills it as one covering interval. After that
-- the interval ledger remembers which days are done.
SELECT CAST(ts AS DATE) AS day, count(*) AS events, sum(amount) AS revenue
FROM events
GROUP BY day`,
			note: 'Windowed delete-and-insert, tracked in an interval ledger. <code>interlace run</code> skips filled windows; <code>restate</code> ignores the ledger.'
		},
		{
			id: 'revenue_report',
			ext: 'sql',
			mat: 'file',
			strat: 'overwrite',
			owned: false,
			file: 'models/revenue_report.sql',
			lang: 'SQL',
			src: `/* interlace:
  materialise: file
  format: parquet
  path: out/daily_revenue.parquet
*/
-- A file materialisation: the daily numbers land as Parquet
-- under out/ on every build.
SELECT day, events, revenue
FROM daily_revenue
ORDER BY day`,
			note: '<strong>Terminal.</strong> No snapshot, no environment view, and environment-gated — a dev apply builds it and reports the delivery as <em>gated</em> rather than writing the file.'
		}
	];

	// `compact` drops the source panel so the explorer can shrink to a node
	// chain when something else needs the room.
	let { compact = false }: { compact?: boolean } = $props();

	const all = [...spine, ...rest];
	let activeId = $state('user_ltv');
	const active = $derived(all.find((n) => n.id === activeId) ?? all[0]);
</script>

<div class="explorer">
	<div class="explorer-bar">
		<span>examples/benchmark · 25M rows</span>
		<span class="explorer-count">10 nodes · 9 edges</span>
	</div>

	<div class="flow">
		{#each spine as node, i (node.id)}
			<button
				class="node"
				class:node-on={activeId === node.id}
				aria-pressed={activeId === node.id}
				onclick={() => (activeId = node.id)}
			>
				<span class="node-name">{node.id}<span class="node-ext">.{node.ext}</span></span>
				<span class="node-meta">
					<span class:plane-owned={node.owned} class:plane-terminal={!node.owned}>{node.mat}</span>
					<span class="node-strat">{node.strat}</span>
				</span>
			</button>
			{#if i < spine.length - 1}
				<div class="arrow" aria-hidden="true">
					<svg viewBox="0 0 10 15" fill="none">
						<path d="M5 0v12M1 8l4 4 4-4" stroke="currentColor" stroke-width="1.3" />
					</svg>
				</div>
			{/if}
		{/each}
	</div>

	<p class="rest-label">elsewhere in the same graph</p>
	<div class="flow flow-rest">
		{#each rest as node (node.id)}
			<button
				class="node"
				class:node-on={activeId === node.id}
				aria-pressed={activeId === node.id}
				onclick={() => (activeId = node.id)}
			>
				<span class="node-name">{node.id}<span class="node-ext">.{node.ext}</span></span>
				<span class="node-meta">
					<span class:plane-owned={node.owned} class:plane-terminal={!node.owned}>{node.mat}</span>
					<span class="node-strat">{node.strat}</span>
				</span>
			</button>
		{/each}
	</div>

	{#if !compact}
		<div class="source">
			<div class="source-bar">
				<span class="source-lang">{active.lang}</span>
				<span>{active.file}</span>
			</div>
			<pre><code>{active.src}</code></pre>
		</div>

		<!-- eslint-disable svelte/no-at-html-tags -- static copy above, no user input -->
		<p class="explorer-note">{@html active.note}</p>
		<!-- eslint-enable svelte/no-at-html-tags -->
	{/if}
</div>

<style>
	.explorer {
		@apply overflow-hidden rounded-xl;
		border: 1px solid var(--border);
		background: var(--background-secondary);
	}

	.explorer-bar {
		@apply flex items-center gap-2 px-4 py-2.5 font-mono text-xs;
		border-bottom: 1px solid var(--border);
		color: var(--text-quaternary);
	}

	.explorer-count {
		@apply ml-auto;
	}

	.flow {
		@apply flex flex-col px-4 pt-4;
	}

	.flow-rest {
		@apply gap-1.5 pt-0 pb-4;
	}

	.node {
		@apply flex w-full cursor-pointer items-baseline gap-3 rounded-md px-3 py-2 text-left;
		border: 1px solid var(--border-active);
		background: none;
		color: inherit;
	}

	.node:hover {
		border-color: var(--text-primary);
	}

	.node-on {
		border-color: var(--accent);
		background: var(--accent-dimmer);
	}

	.node-name {
		@apply font-mono text-sm font-semibold whitespace-nowrap;
	}

	.node-ext {
		color: var(--text-quaternary);
		font-weight: 500;
	}

	.node-meta {
		@apply ml-auto flex gap-2 font-mono text-xs whitespace-nowrap;
	}

	.plane-owned {
		color: var(--plane-owned);
	}

	.plane-terminal {
		color: var(--plane-terminal);
	}

	.node-strat {
		color: var(--text-secondary);
	}

	.arrow {
		@apply grid h-4 place-items-center;
		color: var(--text-quaternary);
	}

	.arrow svg {
		@apply h-4 w-2.5;
	}

	.rest-label {
		@apply px-4 pt-3 pb-2 font-mono text-xs;
		color: var(--text-quaternary);
	}

	.source {
		border-top: 1px solid var(--border);
		background: var(--surface);
	}

	.source-bar {
		@apply flex items-center gap-2 px-4 py-2 font-mono text-xs;
		border-bottom: 1px solid var(--border);
		color: var(--text-secondary);
	}

	.source-lang {
		@apply rounded px-1.5 py-0.5 text-[0.66rem] tracking-wider;
		border: 1px solid currentColor;
		color: var(--accent);
	}

	.source pre {
		@apply m-0 overflow-x-auto p-4 font-mono text-xs;
		line-height: 1.7;
		color: var(--text-primary);
	}

	.explorer-note {
		@apply m-0 px-4 py-3 font-mono text-xs;
		border-top: 1px solid var(--border);
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.explorer-note :global(strong) {
		color: var(--text-primary);
		font-weight: 600;
	}

	.explorer-note :global(code) {
		color: var(--accent);
	}

	@media (max-width: 430px) {
		.node-meta {
			@apply hidden;
		}
	}
</style>
