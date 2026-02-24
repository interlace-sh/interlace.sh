<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	interface Heading {
		id: string;
		text: string;
		level: number;
	}

	let headings = $state<Heading[]>([]);
	let activeId = $state('');

	function extractHeadings() {
		const article = document.querySelector('article.prose');
		if (!article) return;

		const elements = article.querySelectorAll('h2, h3');
		headings = Array.from(elements)
			.filter((el) => el.id)
			.map((el) => ({
				id: el.id,
				text: el.textContent?.replace(/^#\s*/, '').replace(/\s*#$/, '') || '',
				level: parseInt(el.tagName[1])
			}));
	}

	onMount(() => {
		extractHeadings();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
					}
				}
			},
			{ rootMargin: '-80px 0px -80% 0px' }
		);

		for (const heading of headings) {
			const el = document.getElementById(heading.id);
			if (el) observer.observe(el);
		}

		return () => observer.disconnect();
	});

	// Re-extract on page navigation
	$effect(() => {
		void $page.url.pathname;
		// Wait for DOM to update
		setTimeout(extractHeadings, 100);
	});
</script>

{#if headings.length > 0}
	<nav class="toc">
		<h3 class="toc-title">On this page</h3>
		<ul class="toc-list">
			{#each headings as heading (heading.id)}
				<li>
					<a
						href="#{heading.id}"
						class="toc-link"
						class:toc-link-active={activeId === heading.id}
						class:toc-indent={heading.level === 3}
					>
						{heading.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.toc-title {
		@apply mb-3 text-xs font-semibold tracking-wider uppercase;
		color: var(--text-tertiary);
	}

	.toc-list {
		@apply space-y-1;
	}

	.toc-link {
		@apply block py-1 text-xs;
		color: var(--text-tertiary);
		transition: color 150ms ease;
	}

	.toc-link:hover {
		color: var(--text-primary);
	}

	.toc-link-active {
		color: var(--accent);
	}

	.toc-indent {
		@apply pl-3;
	}
</style>
