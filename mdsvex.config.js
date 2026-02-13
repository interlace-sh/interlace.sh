import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';
import json from 'highlight.js/lib/languages/json';

// Register languages
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('json', json);

/** @type {import('mdsvex').MdsvexOptions} */
const config = {
	extensions: ['.md', '.svx'],
	smartypants: {
		dashes: 'oldschool'
	},
	highlight: {
		highlighter: (code, lang) => {
			let highlighted;
			if (lang && hljs.getLanguage(lang)) {
				highlighted = hljs.highlight(code, { language: lang }).value;
			} else {
				// For unrecognized languages, just escape and return plain text
				highlighted = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			}
			// Escape curly braces so Svelte doesn't interpret them as expressions
			const escaped = highlighted.replace(/{/g, '&#123;').replace(/}/g, '&#125;');
			return `<pre class="hljs"><code class="language-${lang || 'text'}">${escaped}</code></pre>`;
		}
	},
	rehypePlugins: [
		rehypeSlug,
		[
			rehypeAutolinkHeadings,
			{
				behavior: 'append',
				properties: {
					className: ['heading-link'],
					ariaHidden: true,
					tabIndex: -1
				},
				content: {
					type: 'element',
					tagName: 'span',
					properties: { className: ['heading-anchor-icon'] },
					children: [{ type: 'text', value: ' #' }]
				}
			}
		]
	]
};

export default config;
