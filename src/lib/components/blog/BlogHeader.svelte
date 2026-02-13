<script lang="ts">
	let { title, date }: { title: string; date: string } = $props();

	const formatted = $derived(
		new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
</script>

<header class="blog-header">
	<p class="blog-date">{formatted}</p>
	<h1 class="blog-title">{title}</h1>
</header>

<style>
	.blog-header {
		@apply mb-10 border-b pb-8;
		border-color: var(--border);
	}

	.blog-date {
		@apply mb-3 text-sm;
		color: var(--text-tertiary);
	}

	.blog-title {
		@apply text-3xl font-bold md:text-4xl;
		color: var(--text-primary);
	}
</style>
