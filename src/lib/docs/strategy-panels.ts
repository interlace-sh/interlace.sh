/**
 * The nine strategy scenarios. The homepage and the strategies doc both
 * render these, so a note edited in one place cannot drift from the other.
 * Wording is the docs page (the long form).
 */
export type StrategyTag = 'ins' | 'upd' | 'del' | 'kept' | 'skip' | 'closed' | 'unread';

export type StrategyRow = {
	id: string;
	val: string;
	meta?: string;
	tag?: StrategyTag;
};

export type StrategyPanel = {
	id: string;
	/** Homepage grid: this panel sits alone on its row. */
	solo?: boolean;
	name: string;
	qualifier?: string;
	blurb: string;
	sourceLabel?: string;
	source: StrategyRow[];
	sourceDivider?: { after: number; label: string };
	before: StrategyRow[];
	after: StrategyRow[];
	sql: string;
	note?: string;
	caution?: boolean;
};

const source: StrategyRow[] = [
	{ id: '1', val: 'A′' },
	{ id: '2', val: 'B' },
	{ id: '4', val: 'D' }
];

const before: StrategyRow[] = [
	{ id: '1', val: 'A' },
	{ id: '2', val: 'B' },
	{ id: '3', val: 'C' }
];

const windowSource: StrategyRow[] = [
	{ id: '9', val: 'Z', meta: '05-30', tag: 'unread' },
	{ id: '1', val: 'A′', meta: '06-01' },
	{ id: '4', val: 'D', meta: '06-01' }
];

const windowBefore: StrategyRow[] = [
	{ id: '1', val: 'A', meta: '06-01' },
	{ id: '3', val: 'C', meta: '06-01' },
	{ id: '9', val: 'Z', meta: '05-30' }
];

const windowDivider = { after: 1, label: 'window → [06-01, 06-02)' };

export const strategyPanels: StrategyPanel[] = [
	{
		id: 'replace',
		name: 'replace',
		qualifier: 'owned table · the default',
		blurb:
			'Rewrite the whole table from the query. The target ends up an exact copy of the source.',
		source,
		before,
		after: [
			{ id: '1', val: 'A′', tag: 'ins' },
			{ id: '2', val: 'B', tag: 'ins' },
			{ id: '4', val: 'D', tag: 'ins' },
			{ id: '1', val: 'A', tag: 'del' },
			{ id: '2', val: 'B', tag: 'del' },
			{ id: '3', val: 'C', tag: 'del' }
		],
		sql: 'CREATE OR REPLACE TABLE target AS <query>',
		note: 'Every existing row goes, including row 2, which did not change. Row 3 has no source row, so it does not come back — target-only rows are lost.',
		caution: true
	},
	{
		id: 'append',
		name: 'append',
		qualifier: 'external table only',
		blurb:
			"Add the query's rows. Nothing is deleted and nothing is matched, so the target only grows.",
		source,
		before,
		after: [
			{ id: '1', val: 'A', tag: 'kept' },
			{ id: '2', val: 'B', tag: 'kept' },
			{ id: '3', val: 'C', tag: 'kept' },
			{ id: '1', val: 'A′', tag: 'ins' },
			{ id: '2', val: 'B', tag: 'ins' },
			{ id: '4', val: 'D', tag: 'ins' }
		],
		sql: 'INSERT INTO target SELECT * FROM (<query>)',
		note: 'There is no key, so ids 1 and 2 now appear twice. That is the point for a log or event table, and wrong for anything you expect to be unique.'
	},
	{
		id: 'merge',
		name: 'merge',
		qualifier: 'keyed upsert · partial',
		blurb:
			"Upsert the query's rows by key. Keys already in the target but absent from this run are left alone.",
		source,
		before,
		after: [
			{ id: '1', val: 'A′', tag: 'upd' },
			{ id: '2', val: 'B', tag: 'upd' },
			{ id: '3', val: 'C', tag: 'kept' },
			{ id: '4', val: 'D', tag: 'ins' }
		],
		sql: 'MERGE INTO target USING (<query>) ON _t.id = _s.id',
		note: 'Row 3 survives because merge never deletes. Row 2 is rewritten even though nothing changed — native MERGE touches every matched row; hash_merge is the version that does not.'
	},
	{
		id: 'full_merge',
		name: 'full_merge',
		qualifier: 'full-state sync',
		blurb: 'Treat the query as the complete desired state, and apply only the difference.',
		source,
		before,
		after: [
			{ id: '1', val: 'A′', tag: 'upd' },
			{ id: '2', val: 'B', tag: 'skip' },
			{ id: '4', val: 'D', tag: 'ins' },
			{ id: '3', val: 'C', tag: 'del' }
		],
		sql: 'DELETE fresh keys; DELETE keys not in source; INSERT (source EXCEPT current)',
		note: 'Same end state as replace, reached incrementally: row 2 is in no difference so it is never rewritten, and row 3 — absent from a full-state source — is a delete.'
	},
	{
		id: 'hash_merge',
		solo: true,
		name: 'hash_merge',
		qualifier: 'change-detected upsert',
		blurb:
			'A keyed upsert that stores an _hash of the non-key columns and writes only what actually changed.',
		sourceLabel: 'source · _hash',
		source: [
			{ id: '1', val: 'A′', meta: '#f31c' },
			{ id: '2', val: 'B', meta: '#9b2e' },
			{ id: '4', val: 'D', meta: '#0d7a' }
		],
		before: [
			{ id: '1', val: 'A', meta: '#a04e' },
			{ id: '2', val: 'B', meta: '#9b2e' },
			{ id: '3', val: 'C', meta: '#5cc1' }
		],
		after: [
			{ id: '1', val: 'A′', tag: 'upd' },
			{ id: '2', val: 'B', tag: 'skip' },
			{ id: '3', val: 'C', tag: 'kept' },
			{ id: '4', val: 'D', tag: 'ins' }
		],
		sql: 'UPDATE WHERE _hash <> _hash; INSERT WHERE key NOT IN target',
		note: "Row 2's hash matches, so nothing is written for it. Row 3 is kept — unlike full_merge, a vanished key is not a delete, because this is an upsert."
	},
	{
		id: 'scd',
		name: 'scd',
		qualifier: 'type 2 · processing time',
		blurb:
			'Never overwrite. A changed row has its open version closed and a new one inserted, so the old value stays queryable.',
		source,
		before: [
			{ id: '1', val: 'A', meta: 'open' },
			{ id: '2', val: 'B', meta: 'open' },
			{ id: '3', val: 'C', meta: 'open' }
		],
		after: [
			{ id: '1', val: 'A', meta: '→ now()', tag: 'closed' },
			{ id: '1', val: 'A′', meta: 'now() →', tag: 'ins' },
			{ id: '2', val: 'B', meta: 'open', tag: 'kept' },
			{ id: '3', val: 'C', meta: '→ now()', tag: 'closed' },
			{ id: '4', val: 'D', meta: 'now() →', tag: 'ins' }
		],
		sql: 'UPDATE open SET _valid_to = now() WHERE key IN (open EXCEPT source); INSERT (source EXCEPT open)',
		note: 'Row 2 is in neither difference, so re-running is a no-op. Row 3 vanished upstream, which counts as a change: its version is closed rather than deleted. Query the present with _valid_to IS NULL.'
	},
	{
		id: 'scd_time',
		name: 'scd + time_column',
		qualifier: 'type 2 · event time',
		blurb:
			'The same shape, but the validity windows follow the data: they abut on when the change happened, not on when interlace saw it.',
		sourceLabel: 'source · updated_at',
		source: [
			{ id: '1', val: 'A′', meta: '09:15' },
			{ id: '2', val: 'B', meta: '08:00' },
			{ id: '4', val: 'D', meta: '09:40' }
		],
		before: [
			{ id: '1', val: 'A', meta: '08:00 →' },
			{ id: '2', val: 'B', meta: '08:00 →' },
			{ id: '3', val: 'C', meta: '08:00 →' }
		],
		after: [
			{ id: '1', val: 'A', meta: '→ 09:15', tag: 'closed' },
			{ id: '1', val: 'A′', meta: '09:15 →', tag: 'ins' },
			{ id: '2', val: 'B', meta: '08:00 →', tag: 'kept' },
			{ id: '3', val: 'C', meta: '→ now()', tag: 'closed' },
			{ id: '4', val: 'D', meta: '09:40 →', tag: 'ins' }
		],
		sql: '_valid_from / _valid_to taken from updated_at instead of now()',
		note: "Row 1's old version closes at 09:15 and its new one opens at 09:15 — no gap, no overlap. Row 3 has no succeeding event, so it is still closed at processing time."
	},
	{
		id: 'incremental',
		name: 'incremental',
		qualifier: 'no key · the window is authoritative',
		blurb:
			'Read only the rows inside the window, then rewrite that window: delete everything already in it, insert what the source now says.',
		sourceLabel: 'source · event_at',
		source: windowSource,
		sourceDivider: windowDivider,
		before: windowBefore,
		after: [
			{ id: '1', val: 'A′', meta: '06-01', tag: 'ins' },
			{ id: '4', val: 'D', meta: '06-01', tag: 'ins' },
			{ id: '3', val: 'C', meta: '06-01', tag: 'del' },
			{ id: '9', val: 'Z', meta: '05-30', tag: 'kept' }
		],
		sql: "DELETE WHERE event_at >= start AND < end; INSERT the window's rows",
		note: 'Row 3 was inside the window and is no longer in the source, so it goes: the period is rewritten from scratch. Row 9 sits outside the window and is never touched. Delete-then-reinsert is what makes reprocessing a window idempotent, and backfill and restate safe.'
	},
	{
		id: 'incremental_key',
		name: 'incremental + key',
		qualifier: 'keyed · the window only bounds what is read',
		blurb:
			'Same window, same rows read — but the rows are upserted by key instead of the period being rewritten.',
		sourceLabel: 'source · event_at',
		source: windowSource,
		sourceDivider: windowDivider,
		before: windowBefore,
		after: [
			{ id: '1', val: 'A′', meta: '06-01', tag: 'upd' },
			{ id: '3', val: 'C', meta: '06-01', tag: 'kept' },
			{ id: '4', val: 'D', meta: '06-01', tag: 'ins' },
			{ id: '9', val: 'Z', meta: '05-30', tag: 'kept' }
		],
		sql: 'MERGE INTO target USING (<query> filtered to the window) ON key',
		note: "Identical inputs to the panel above, opposite outcome for row 3: only keys the window's source supplies are touched, so a row that stopped being produced survives. Use this for late corrections to already-published rows; use the unkeyed form when the source is the whole truth for a period."
	}
];

export function strategyPanel(id: string): StrategyPanel {
	const found = strategyPanels.find((panel) => panel.id === id);
	if (!found) throw new Error(`unknown strategy panel: ${id}`);
	return found;
}
