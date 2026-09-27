<script lang="ts">
	import { strategyPanel } from '$lib/docs/strategy-panels';
	import StrategyDiagram from './StrategyDiagram.svelte';

	let { id }: { id: string } = $props();
	const panel = $derived(strategyPanel(id));
</script>

<StrategyDiagram
	name={panel.name}
	qualifier={panel.qualifier}
	blurb={panel.blurb}
	sourceLabel={panel.sourceLabel}
	source={panel.source}
	sourceDivider={panel.sourceDivider}
	before={panel.before}
	after={panel.after}
	sql={panel.sql}
	note={panel.note}
	caution={panel.caution}
/>
