import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { globSync } from 'node:fs';

/**
 * Every docs page's `<title>` and `<meta name="description">` come from its own
 * frontmatter, via the `DocsPage` mdsvex layout. Before that, the docs layout
 * hardcoded one title for the whole section, so all ~27 pages shared it and
 * competed with each other in search results.
 *
 * A new page inherits a generic fallback description silently — nothing breaks,
 * it just quietly stops being findable. These assert the contract instead.
 */

const DOCS = join(process.cwd(), 'src/routes/docs');

const pages = globSync('**/+page.md', { cwd: DOCS }).map((rel) => {
	const raw = readFileSync(join(DOCS, rel), 'utf-8');
	const match = /^---\n([\s\S]*?)\n---\n/.exec(raw);
	if (!match) throw new Error(`${rel}: no frontmatter block`);

	const frontmatter: Record<string, string> = {};
	for (const line of match[1].split('\n')) {
		const kv = /^([a-z]+):\s*(.*)$/.exec(line);
		if (kv) frontmatter[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
	}
	return { path: relative(process.cwd(), join(DOCS, rel)), frontmatter };
});

describe('docs frontmatter', () => {
	it('finds every docs page', () => {
		expect(pages.length).toBeGreaterThan(20);
	});

	it.each(pages)('$path has a title', ({ frontmatter }) => {
		expect(frontmatter.title?.length ?? 0).toBeGreaterThan(0);
	});

	it.each(pages)('$path has its own description', ({ frontmatter }) => {
		expect(frontmatter.description?.length ?? 0).toBeGreaterThan(0);
	});

	// Search engines truncate around 155-160 characters. Over that isn't an
	// error, but it means the tail is written for nobody.
	it.each(pages)('$path description fits a search result', ({ frontmatter }) => {
		expect(frontmatter.description.length).toBeLessThanOrEqual(165);
	});

	it('gives every page a distinct title and description', () => {
		const titles = pages.map((p) => p.frontmatter.title);
		const descriptions = pages.map((p) => p.frontmatter.description);
		expect(new Set(titles).size).toBe(titles.length);
		expect(new Set(descriptions).size).toBe(descriptions.length);
	});
});
