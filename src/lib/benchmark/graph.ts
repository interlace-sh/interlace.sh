/**
 * The examples/benchmark graph. The homepage explorer and the plan/apply
 * table both project this list, so a model cannot appear in one and not the other.
 * `run` is the measured `interlace run` line; ephemeral models have none.
 */
export type RowDelta = { text: string; kind: 'add' | 'upd' | 'del' | 'none' };

export type BenchmarkRun = {
	order: number;
	output: string;
	strategy: string;
	engine: string;
	deps: string;
	rows: RowDelta[];
	time: string;
};

export type BenchmarkNode = {
	id: string;
	ext: 'sql' | 'py';
	mat: string;
	strat: string;
	owned: boolean;
	lane: 'spine' | 'rest';
	upstream: string[];
	run?: BenchmarkRun;
};

const add = (text: string): RowDelta => ({ text, kind: 'add' });
const none: RowDelta = { text: '—', kind: 'none' };

export const benchmarkNodes: BenchmarkNode[] = [
	{
		id: 'events',
		ext: 'sql',
		mat: 'virtual',
		strat: 'replace',
		owned: true,
		lane: 'spine',
		upstream: [],
		run: {
			order: 0,
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: '—',
			rows: [add('+25,000,000')],
			time: '3.85s'
		}
	},
	{
		id: 'enriched',
		ext: 'sql',
		mat: 'ephemeral',
		strat: '—',
		owned: true,
		lane: 'spine',
		upstream: ['events']
	},
	{
		id: 'by_user',
		ext: 'sql',
		mat: 'virtual',
		strat: 'replace',
		owned: true,
		lane: 'spine',
		upstream: ['enriched'],
		run: {
			order: 7,
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'enriched',
			rows: [add('+100,000')],
			time: '0.45s'
		}
	},
	{
		id: 'user_ltv',
		ext: 'py',
		mat: 'virtual',
		strat: 'merge',
		owned: true,
		lane: 'spine',
		upstream: ['by_user'],
		run: {
			order: 11,
			output: 'virtual',
			strategy: 'merge',
			engine: 'default',
			deps: 'by_user',
			rows: [add('+100,000')],
			time: '0.15s'
		}
	},
	{
		id: 'by_day',
		ext: 'sql',
		mat: 'virtual',
		strat: 'replace',
		owned: true,
		lane: 'rest',
		upstream: ['enriched'],
		run: {
			order: 4,
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'enriched',
			rows: [add('+30')],
			time: '0.08s'
		}
	},
	{
		id: 'by_device',
		ext: 'sql',
		mat: 'virtual',
		strat: 'replace',
		owned: true,
		lane: 'rest',
		upstream: ['enriched'],
		run: {
			order: 5,
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'enriched',
			rows: [add('+4')],
			time: '0.11s'
		}
	},
	{
		id: 'by_product',
		ext: 'sql',
		mat: 'virtual',
		strat: 'replace',
		owned: true,
		lane: 'rest',
		upstream: ['enriched'],
		run: {
			order: 6,
			output: 'virtual',
			strategy: 'replace',
			engine: 'default',
			deps: 'enriched',
			rows: [add('+15,000')],
			time: '0.21s'
		}
	},
	{
		id: 'top_products',
		ext: 'sql',
		mat: 'view',
		strat: '—',
		owned: true,
		lane: 'rest',
		upstream: ['by_product'],
		run: {
			order: 9,
			output: 'view',
			strategy: 'replace',
			engine: 'default',
			deps: 'by_product',
			rows: [none],
			time: '0.36s'
		}
	},
	{
		id: 'daily_revenue',
		ext: 'sql',
		mat: 'virtual',
		strat: 'incremental',
		owned: true,
		lane: 'rest',
		upstream: ['events'],
		run: {
			order: 1,
			output: 'virtual',
			strategy: 'incremental',
			engine: 'default',
			deps: 'events',
			rows: [add('+29')],
			time: '0.28s'
		}
	},
	{
		id: 'revenue_report',
		ext: 'sql',
		mat: 'file',
		strat: 'replace',
		owned: false,
		lane: 'rest',
		upstream: ['daily_revenue'],
		run: {
			order: 3,
			output: 'file',
			strategy: 'replace',
			engine: 'default',
			deps: 'daily_revenue',
			rows: [add('+29')],
			time: '0.07s'
		}
	},
	{
		id: 'product_catalog',
		ext: 'sql',
		mat: 'virtual',
		strat: 'full_merge',
		owned: true,
		lane: 'rest',
		upstream: ['by_product'],
		run: {
			order: 8,
			output: 'virtual',
			strategy: 'full_merge',
			engine: 'default',
			deps: 'by_product',
			rows: [add('+15,000')],
			time: '0.34s'
		}
	},
	{
		id: 'user_history',
		ext: 'sql',
		mat: 'virtual',
		strat: 'scd',
		owned: true,
		lane: 'rest',
		upstream: ['by_user'],
		run: {
			order: 10,
			output: 'virtual',
			strategy: 'scd',
			engine: 'default',
			deps: 'by_user',
			rows: [add('+100,000')],
			time: '0.09s'
		}
	},
	{
		id: 'daily_feed',
		ext: 'sql',
		mat: 'table',
		strat: 'append',
		owned: false,
		lane: 'rest',
		upstream: ['daily_revenue'],
		run: {
			order: 2,
			output: 'table',
			strategy: 'append',
			engine: 'default',
			deps: 'daily_revenue',
			rows: [add('+29')],
			time: '0.30s'
		}
	}
];

export const benchmarkEdgeCount = benchmarkNodes.reduce(
	(count, node) => count + node.upstream.length,
	0
);

export function benchmarkRunRows(): BenchmarkNode[] {
	return benchmarkNodes.filter((node) => node.run).sort((a, b) => a.run!.order - b.run!.order);
}
