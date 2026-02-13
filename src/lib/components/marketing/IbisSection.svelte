<section class="section" id="ibis">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Ibis-Powered</p>
			<h2 class="section-title">Write Python, execute SQL</h2>
			<p class="section-description">
				Interlace uses ibis for all data transformations. Write expressive Python that compiles to
				optimized SQL and runs in your database — not in Python memory.
			</p>
		</div>

		<div class="code-block example-block">
			<div class="code-block-header">
				<span class="code-lang">Python (ibis)</span>
				<span class="code-note">Compiles to SQL at runtime</span>
			</div>
			<pre><code><span class="decorator">@model</span>(<span class="string">"active_users"</span>, materialise=<span class="string">"table"</span>)
<span class="keyword">def</span> <span class="function">active_users</span>(users: ibis.Table, events: ibis.Table) -> ibis.Table:
    recent = events.filter(events.timestamp > ibis.now() - ibis.interval(days=<span class="number">30</span>))
    <span class="keyword">return</span> (
        users.join(recent, users.id == recent.user_id)
        .group_by(users.id, users.name, users.email)
        .agg(event_count=recent.id.count())
        .filter(<span class="keyword">lambda</span> t: t.event_count >= <span class="number">5</span>)
    )</code></pre>
		</div>
	</div>
</section>

<style>
	.example-block {
		@apply mx-auto max-w-3xl;
	}

	.code-lang {
		@apply text-xs font-semibold;
		color: var(--accent);
	}

	.code-note {
		@apply text-xs;
		color: var(--text-tertiary);
	}
</style>
