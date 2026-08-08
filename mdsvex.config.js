import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import diff from 'highlight.js/lib/languages/diff';

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
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('patch', diff);

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @param {string} file */
const layoutPath = (file) => join(projectRoot, 'src/lib/layouts', file);

/** @type {import('mdsvex').MdsvexOptions} */
const config = {
	extensions: ['.md', '.svx'],
	// Per-folder layouts, keyed on the route directory. These render no chrome —
	// they exist so every .md page emits its own title/description/OG tags from
	// its frontmatter instead of inheriting the site defaults.
	// Paths must be absolute: mdsvex writes them verbatim into each generated
	// module, where a relative path would resolve against the .md file.
	layout: {
		blog: layoutPath('BlogPost.svelte'),
		docs: layoutPath('DocsPage.svelte')
	},
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
