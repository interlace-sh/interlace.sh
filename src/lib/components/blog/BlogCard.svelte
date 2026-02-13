<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';

	let { title, date, excerpt, href }: { title: string; date: string; excerpt: string; href: string } = $props();

	const formatted = $derived(
		new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
</script>

<a {href} class="card-hover blog-card">
	<p class="card-date">{formatted}</p>
	<h2 class="card-title">{title}</h2>
	<p class="card-excerpt">{excerpt}</p>
	<span class="card-link">
		Read more
		<ArrowRight size={14} />
	</span>
</a>

<style>
	.blog-card {
		@apply block p-6;
	}

	.card-date {
		@apply mb-2 text-xs;
		color: var(--text-tertiary);
	}

	.card-title {
		@apply mb-2 text-lg font-semibold;
		color: var(--text-primary);
	}

	.card-excerpt {
		@apply mb-4 text-sm;
		color: var(--text-secondary);
	}

	.card-link {
		@apply inline-flex items-center gap-1 text-sm font-medium;
		color: var(--accent);
	}
</style>
