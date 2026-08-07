<script lang="ts">
	import { StrategyDiagram, StrategyLegend } from '$lib/components/docs';

	/**
	 * All seven, one scenario: row 1 changed in source, row 2 is unchanged,
	 * row 3 exists only in the target, row 4 is new. Holding the inputs fixed
	 * is what makes the outcomes comparable at a glance.
	 *
	 * `incremental` needs a time dimension, so it carries its own rows.
	 */
	const SOURCE = [
		{ id: '1', val: 'A′' },
		{ id: '2', val: 'B' },
		{ id: '4', val: 'D' }
	];
	const BEFORE = [
		{ id: '1', val: 'A' },
		{ id: '2', val: 'B' },
		{ id: '3', val: 'C' }
	];
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
			<StrategyDiagram
				name="replace"
				qualifier="the default"
				blurb="Rewrite the whole table. The target ends up an exact copy of the source."
				source={SOURCE}
				before={BEFORE}
				after={[
					{ id: '1', val: 'A′', tag: 'ins' },
					{ id: '2', val: 'B', tag: 'ins' },
					{ id: '4', val: 'D', tag: 'ins' },
					{ id: '1', val: 'A', tag: 'del' },
					{ id: '2', val: 'B', tag: 'del' },
					{ id: '3', val: 'C', tag: 'del' }
				]}
				sql="CREATE OR REPLACE TABLE target AS <query>"
				note="Every existing row goes. Row 3 has no source row, so it does not come back."
			/>

			<StrategyDiagram
				name="append"
				qualifier="external table only"
				blurb="Add the query's rows. Nothing is deleted and nothing is matched, so the target only grows."
				source={SOURCE}
				before={BEFORE}
				after={[
					{ id: '1', val: 'A', tag: 'kept' },
					{ id: '2', val: 'B', tag: 'kept' },
					{ id: '3', val: 'C', tag: 'kept' },
					{ id: '1', val: 'A′', tag: 'ins' },
					{ id: '2', val: 'B', tag: 'ins' },
					{ id: '4', val: 'D', tag: 'ins' }
				]}
				sql="INSERT INTO target SELECT * FROM (<query>)"
				note="No key, so ids 1 and 2 now appear twice — right for a log, wrong for anything you expect to be unique."
			/>

			<StrategyDiagram
				name="merge"
				qualifier="keyed upsert"
				blurb="Upsert by key. Keys already in the target but absent from this run are left alone."
				source={SOURCE}
				before={BEFORE}
				after={[
					{ id: '1', val: 'A′', tag: 'upd' },
					{ id: '2', val: 'B', tag: 'upd' },
					{ id: '3', val: 'C', tag: 'kept' },
					{ id: '4', val: 'D', tag: 'ins' }
				]}
				sql="MERGE INTO target USING (<query>) ON _t.id = _s.id"
				note="Row 3 survives, because merge never deletes. Row 2 is rewritten even though nothing changed."
			/>

			<StrategyDiagram
				name="full_merge"
				qualifier="full-state sync"
				blurb="Treat the query as the complete desired state, and apply only the difference."
				source={SOURCE}
				before={BEFORE}
				after={[
					{ id: '1', val: 'A′', tag: 'upd' },
					{ id: '2', val: 'B', tag: 'skip' },
					{ id: '4', val: 'D', tag: 'ins' },
					{ id: '3', val: 'C', tag: 'del' }
				]}
				sql="DELETE fresh keys; DELETE keys not in source; INSERT (source EXCEPT current)"
				note="Same end state as replace, reached incrementally — and a key that vanished upstream is a delete."
			/>

			<div class="solo">
				<StrategyDiagram
					name="hash_merge"
					qualifier="change-detected upsert"
					blurb="A keyed upsert that stores an _hash of the non-key columns and writes only what actually changed."
					sourceLabel="source · _hash"
					source={[
						{ id: '1', val: 'A′', meta: '#f31c' },
						{ id: '2', val: 'B', meta: '#9b2e' },
						{ id: '4', val: 'D', meta: '#0d7a' }
					]}
					before={[
						{ id: '1', val: 'A', meta: '#a04e' },
						{ id: '2', val: 'B', meta: '#9b2e' },
						{ id: '3', val: 'C', meta: '#5cc1' }
					]}
					after={[
						{ id: '1', val: 'A′', tag: 'upd' },
						{ id: '2', val: 'B', tag: 'skip' },
						{ id: '3', val: 'C', tag: 'kept' },
						{ id: '4', val: 'D', tag: 'ins' }
					]}
					sql="UPDATE WHERE _hash <> _hash; INSERT WHERE key NOT IN target"
					note="Row 2's hash matches, so nothing is written for it. Unlike full_merge, a vanished key is kept."
				/>
			</div>

			<StrategyDiagram
				name="scd"
				qualifier="type 2 · keeps history"
				blurb="Never overwrite. A changed row has its version closed and a new one opened, so the old value stays queryable."
				source={SOURCE}
				before={[
					{ id: '1', val: 'A', meta: 'open' },
					{ id: '2', val: 'B', meta: 'open' },
					{ id: '3', val: 'C', meta: 'open' }
				]}
				after={[
					{ id: '1', val: 'A', meta: '→ now()', tag: 'closed' },
					{ id: '1', val: 'A′', meta: 'now() →', tag: 'ins' },
					{ id: '2', val: 'B', meta: 'open', tag: 'kept' },
					{ id: '3', val: 'C', meta: '→ now()', tag: 'closed' },
					{ id: '4', val: 'D', meta: 'now() →', tag: 'ins' }
				]}
				sql="UPDATE open SET _valid_to = now() WHERE changed; INSERT the new versions"
				note="Nothing is destroyed. Row 2 is in neither difference, so re-running writes nothing."
			/>

			<StrategyDiagram
				name="scd + time_column"
				qualifier="type 2 · event time"
				blurb="The same shape, but the validity windows follow the data — they abut on when the change happened, not on when interlace saw it."
				sourceLabel="source · updated_at"
				source={[
					{ id: '1', val: 'A′', meta: '09:15' },
					{ id: '2', val: 'B', meta: '08:00' },
					{ id: '4', val: 'D', meta: '09:40' }
				]}
				before={[
					{ id: '1', val: 'A', meta: '08:00 →' },
					{ id: '2', val: 'B', meta: '08:00 →' },
					{ id: '3', val: 'C', meta: '08:00 →' }
				]}
				after={[
					{ id: '1', val: 'A', meta: '→ 09:15', tag: 'closed' },
					{ id: '1', val: 'A′', meta: '09:15 →', tag: 'ins' },
					{ id: '2', val: 'B', meta: '08:00 →', tag: 'kept' },
					{ id: '3', val: 'C', meta: '→ now()', tag: 'closed' },
					{ id: '4', val: 'D', meta: '09:40 →', tag: 'ins' }
				]}
				sql="_valid_from / _valid_to taken from updated_at instead of now()"
				note="Row 1 closes at 09:15 and reopens at 09:15 — no gap, no overlap. Row 3 has no succeeding event, so it still closes at processing time."
			/>

			<StrategyDiagram
				name="incremental"
				qualifier="one time window at a time"
				blurb="Read only the rows inside the window, then rewrite it — or, with a key, upsert within it instead."
				sourceLabel="source · event_at"
				source={[
					{ id: '9', val: 'Z', meta: '05-30', tag: 'unread' },
					{ id: '1', val: 'A′', meta: '06-01' },
					{ id: '4', val: 'D', meta: '06-01' }
				]}
				sourceDivider={{ after: 1, label: 'window → [06-01, 06-02)' }}
				before={[
					{ id: '1', val: 'A', meta: '06-01' },
					{ id: '3', val: 'C', meta: '06-01' },
					{ id: '9', val: 'Z', meta: '05-30' }
				]}
				after={[
					{ id: '1', val: 'A′', meta: '06-01', tag: 'ins' },
					{ id: '4', val: 'D', meta: '06-01', tag: 'ins' },
					{ id: '3', val: 'C', meta: '06-01', tag: 'del' },
					{ id: '9', val: 'Z', meta: '05-30', tag: 'kept' }
				]}
				sql="DELETE WHERE event_at >= start AND < end; INSERT the window's rows"
				note="Row 9 is outside the window and never read. Row 3 is inside it and gone from source, so the rewrite drops it — add a key and it would survive instead."
			/>

			<StrategyDiagram
				name="incremental + key"
				qualifier="the window only bounds what is read"
				blurb="Same window, same rows read — but upserted by key instead of the period being rewritten."
				sourceLabel="source · event_at"
				source={[
					{ id: '9', val: 'Z', meta: '05-30', tag: 'unread' },
					{ id: '1', val: 'A′', meta: '06-01' },
					{ id: '4', val: 'D', meta: '06-01' }
				]}
				sourceDivider={{ after: 1, label: 'window → [06-01, 06-02)' }}
				before={[
					{ id: '1', val: 'A', meta: '06-01' },
					{ id: '3', val: 'C', meta: '06-01' },
					{ id: '9', val: 'Z', meta: '05-30' }
				]}
				after={[
					{ id: '1', val: 'A′', meta: '06-01', tag: 'upd' },
					{ id: '3', val: 'C', meta: '06-01', tag: 'kept' },
					{ id: '4', val: 'D', meta: '06-01', tag: 'ins' },
					{ id: '9', val: 'Z', meta: '05-30', tag: 'kept' }
				]}
				sql="MERGE INTO target USING (<query> filtered to the window) ON key"
				note="Identical inputs to the panel beside it, opposite outcome for row 3: only keys the window supplies are touched, so a row that stopped being produced survives."
			/>
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
