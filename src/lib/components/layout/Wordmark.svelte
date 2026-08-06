<script lang="ts">
	// The mark is inlined rather than referenced as a file so the horizontal
	// loop can inherit currentColor. Loaded via <img> it could not — currentColor
	// resolves to black in a separate document context.
	// Each loop is knocked out by the other loop's own stroke at width 13 against
	// the 6 drawn, clipped to one crossing quadrant, so the 3.5 gap follows the
	// curve and all four crossings read as woven.
	let { size = 26, showWordmark = true }: { size?: number; showWordmark?: boolean } = $props();

	// Mask ids must be unique per instance — the header and footer both render one.
	const uid = $props.id();
</script>

<span class="wordmark">
	<svg viewBox="0 0 64 64" width={size} height={size} fill="none" role="img" aria-label="Interlace">
		<defs>
			<mask id="{uid}-h" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
				<rect width="64" height="64" fill="#fff" />
				<g clip-path="url(#{uid}-tl)">
					<rect
						x="20"
						y="6"
						width="24"
						height="52"
						rx="12"
						fill="none"
						stroke="#000"
						stroke-width="13"
					/>
				</g>
				<g clip-path="url(#{uid}-br)">
					<rect
						x="20"
						y="6"
						width="24"
						height="52"
						rx="12"
						fill="none"
						stroke="#000"
						stroke-width="13"
					/>
				</g>
			</mask>
			<mask id="{uid}-v" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
				<rect width="64" height="64" fill="#fff" />
				<g clip-path="url(#{uid}-tr)">
					<rect
						x="6"
						y="20"
						width="52"
						height="24"
						rx="12"
						fill="none"
						stroke="#000"
						stroke-width="13"
					/>
				</g>
				<g clip-path="url(#{uid}-bl)">
					<rect
						x="6"
						y="20"
						width="52"
						height="24"
						rx="12"
						fill="none"
						stroke="#000"
						stroke-width="13"
					/>
				</g>
			</mask>
			<clipPath id="{uid}-tl"><rect x="10" y="10" width="18" height="18" /></clipPath>
			<clipPath id="{uid}-br"><rect x="36" y="36" width="18" height="18" /></clipPath>
			<clipPath id="{uid}-tr"><rect x="36" y="10" width="18" height="18" /></clipPath>
			<clipPath id="{uid}-bl"><rect x="10" y="36" width="18" height="18" /></clipPath>
		</defs>
		<rect
			x="6"
			y="20"
			width="52"
			height="24"
			rx="12"
			fill="none"
			stroke="var(--accent)"
			stroke-width="6"
			mask="url(#{uid}-h)"
		/>
		<rect
			x="20"
			y="6"
			width="24"
			height="52"
			rx="12"
			fill="none"
			stroke="var(--accent-light)"
			stroke-width="6"
			mask="url(#{uid}-v)"
		/>
	</svg>

	{#if showWordmark}
		<span class="wordmark-text">interlace<span class="wordmark-tld">.sh</span></span>
	{/if}
</span>

<style>
	.wordmark {
		@apply inline-flex items-center gap-2.5;
	}

	.wordmark svg {
		@apply block shrink-0;
	}

	.wordmark-text {
		@apply text-lg font-semibold tracking-tight;
		color: var(--text-primary);
	}

	.wordmark-tld {
		color: var(--text-quaternary);
		font-weight: 500;
	}
</style>
