<script lang="ts">
	import { StrategyDiagram } from '$lib/components/docs';

	/**
	 * Three of the seven, chosen to span the range: rewrite everything, upsert
	 * by key, keep every version. The rest live in the docs.
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
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Strategies</p>
			<h2 class="section-title">Seven ways to land a result</h2>
			<p class="section-description">
				Every strategy is the same contract — given a query and a target, emit the SQL statements
				that reconcile them, atomically. Three of the seven below; the same scenario each time, so
				only the outcome differs.
			</p>
		</div>

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
			note="Row 3 survives, because merge never deletes."
		/>

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
				{ id: '1', val: 'A', meta: '_valid_to = now()', tag: 'closed' },
				{ id: '1', val: 'A′', meta: '_valid_from = now()', tag: 'ins' },
				{ id: '2', val: 'B', meta: 'open', tag: 'kept' },
				{ id: '3', val: 'C', meta: '_valid_to = now()', tag: 'closed' },
				{ id: '4', val: 'D', meta: '_valid_from = now()', tag: 'ins' }
			]}
			sql="UPDATE open SET _valid_to = now() WHERE changed; INSERT the new versions"
			note="Nothing is destroyed. Row 2 is in neither difference, so re-running writes nothing."
		/>

		<p class="more">
			<a href="/docs/core-concepts/strategies">
				See all seven — <code>append</code>, <code>full_merge</code>, <code>hash_merge</code> and
				<code>incremental</code> (with and without a key) →
			</a>
		</p>
	</div>
</section>

<style>
	.more {
		@apply mt-6 text-center text-sm;
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

	.more code {
		font-family: var(--font-mono);
		font-size: 0.85em;
	}
</style>
