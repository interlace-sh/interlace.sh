<section class="section" id="polyglot">
	<div class="container-lg">
		<div class="section-header">
			<p class="section-label">Polyglot</p>
			<h2 class="section-title">Python and SQL, unified</h2>
			<p class="section-description">
				Write models as Python functions or plain SQL files. Mix and match freely — they share the
				same dependency graph, materialisation, and execution engine. Python parameters name their
				upstreams and data crosses as Arrow, never pandas.
			</p>
		</div>

		<div class="code-examples">
			<!-- Python example -->
			<div class="code-block">
				<div class="code-block-header">
					<span class="code-lang">Python</span>
					<span class="code-filename">models/enriched_orders.py</span>
				</div>
				<pre><code
						><span class="keyword">from</span> interlace <span class="keyword">import</span> model

<span class="decorator">@model</span>(strategy=<span class="string">"merge_by_key"</span>, key=<span
							class="string">"order_id"</span
						>)
<span class="keyword">def</span> <span class="function">enriched_orders</span>(orders, users):
    <span class="comment"># params name upstreams; data crosses as Arrow</span>
    <span class="keyword">return</span> join_orders(orders, users)</code
					></pre>
			</div>

			<!-- SQL example -->
			<div class="code-block">
				<div class="code-block-header">
					<span class="code-lang">SQL</span>
					<span class="code-filename">models/daily_revenue.sql</span>
				</div>
				<pre><code
						><span class="comment">/* interlace:</span>
<span class="comment">  strategy: full</span>
<span class="comment">  checks:</span>
<span class="comment">    - not_null: day</span>
<span class="comment">*/</span>
<span class="keyword">SELECT</span>
    date_trunc(<span class="string">'day'</span>, created_at) <span class="keyword">AS</span> day,
    <span class="function">SUM</span>(amount) <span class="keyword">AS</span> revenue,
    <span class="function">COUNT</span>(*) <span class="keyword">AS</span> order_count
<span class="keyword">FROM</span> enriched_orders
<span class="keyword">GROUP BY</span> <span class="number">1</span></code
					></pre>
			</div>
		</div>
	</div>
</section>

<style>
	.code-examples {
		@apply grid gap-6 md:grid-cols-2;
	}

	.code-lang {
		@apply text-xs font-semibold;
		color: var(--accent);
	}

	.code-filename {
		@apply font-mono text-xs;
		color: var(--text-tertiary);
	}
</style>
