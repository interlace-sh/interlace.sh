<script lang="ts">
	// Interlace's ingestion competes with a different set of tools than its
	// transformation does, so it gets its own comparison. Cloudflare is the
	// reference the architecture doc names outright ("Cloudflare-Pipelines-style
	// durable streams"), which makes it the honest thing to be measured against.
	type Row = { question: string; interlace: string; cloudflare: string };

	const rows: Row[] = [
		{
			question: 'How events arrive',
			interlace: 'POST to the daemon you are already running for the API and scheduler',
			cloudflare: 'HTTP endpoint or a Worker, accepted at the edge'
		},
		{
			question: 'What the 200 means',
			interlace: 'Fsynced. The log runs synchronous=FULL, so the write survives power loss',
			cloudflare: 'Accepted for exactly-once delivery downstream'
		},
		{
			question: 'Where events land',
			interlace: 'A table in your own warehouse, which models read like any other',
			cloudflare: 'Iceberg tables or Parquet and JSON files in R2'
		},
		{
			question: 'What transforms them',
			interlace: 'The full model DAG — SQL and Python, after the flush',
			cloudflare: 'SQL in-stream, then anything that can read Iceberg'
		},
		{
			question: 'Who operates it',
			interlace: 'You. One process, one machine',
			cloudflare: 'Cloudflare. Managed, and distributed across their network'
		},
		{
			question: 'Where it can run',
			interlace: 'Anywhere. MIT-licensed, no hosted dependency',
			cloudflare: 'On Cloudflare'
		}
	];
</script>

<section class="section" id="ingestion">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Ingestion</p>
			<h2 class="section-title">A different set of alternatives</h2>
			<p class="section-description">
				dbt, SQLMesh and Airflow do not ingest events, so scoring them on it proves nothing. The
				honest comparison for durable ingestion is the platform Interlace's own architecture doc
				names as the reference.
			</p>
		</div>

		<div class="ing-wrap">
			<table class="ing">
				<thead>
					<tr>
						<th scope="col"><span class="sr">Question</span></th>
						<th scope="col" class="ing-us">Interlace streams</th>
						<th scope="col">Cloudflare Data Platform</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.question)}
						<tr>
							<th scope="row">{row.question}</th>
							<td class="ing-us">{row.interlace}</td>
							<td>{row.cloudflare}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<p class="ing-note">
			Cloudflare is the more capable ingestion platform, and it is not close: a managed, globally
			distributed pipeline with petabyte-scale query on top. Interlace is a single process with a
			write-ahead log. What it buys you is that the events land in the same graph as your models —
			one fingerprinted DAG, one plan, one deployable thing — instead of a second system to run and
			a handoff to get wrong. If you are already on Cloudflare and want managed ingestion at the
			edge, use theirs. Interlace can read the Iceberg tables it produces.
		</p>

		<p class="ing-src">
			Cloudflare capabilities per their
			<a href="https://developers.cloudflare.com/pipelines/" target="_blank" rel="noopener"
				>Pipelines</a
			>
			and
			<a href="https://developers.cloudflare.com/r2/data-catalog/" target="_blank" rel="noopener"
				>R2 Data Catalog</a
			> documentation.
		</p>
	</div>
</section>

<style>
	.ing-wrap {
		@apply overflow-x-auto rounded-xl;
		border: 1px solid var(--border);
	}

	.ing {
		@apply w-full border-collapse text-sm;
		min-width: 620px;
	}

	.sr {
		@apply sr-only;
	}

	.ing thead th {
		@apply px-3.5 py-3 text-left font-mono text-xs font-semibold tracking-widest uppercase;
		color: var(--text-quaternary);
		border-bottom: 1px solid var(--border);
	}

	.ing tbody th {
		@apply px-3.5 py-3 text-left align-top text-sm font-medium;
		color: var(--text-primary);
		border-bottom: 1px solid var(--border);
		width: 22%;
	}

	.ing td {
		@apply px-3.5 py-3 align-top text-xs;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border);
		line-height: 1.55;
	}

	.ing tbody tr:last-child :is(th, td) {
		border-bottom: 0;
	}

	.ing-us {
		background: var(--accent-dimmer);
	}

	.ing-note {
		@apply mx-auto mt-6 max-w-3xl text-sm;
		color: var(--text-secondary);
		line-height: 1.7;
	}

	.ing-src {
		@apply mx-auto mt-3 max-w-3xl text-xs;
		color: var(--text-quaternary);
	}

	.ing-src a {
		color: var(--text-tertiary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.ing-src a:hover {
		color: var(--accent);
	}
</style>
