import { describe, it, expect } from 'vitest';
import { docsNavigation } from '$lib/docs/nav';
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

	it.each(pages.filter((page) => page.frontmatter.nav !== 'false'))(
		'$path is in the docs nav exactly once',
		({ path, frontmatter }) => {
			expect(frontmatter.section?.length ?? 0).toBeGreaterThan(0);
			expect(frontmatter.order?.length ?? 0).toBeGreaterThan(0);
			const href = '/' + path.replace(/^src\/routes\//, '').replace(/\/\+page\.md$/, '');
			const matches = docsNavigation().pages.filter((item) => item.href === href);
			expect(matches).toHaveLength(1);
			expect(matches[0].label).toBe(frontmatter.title);
		}
	);

	it('pages prev/next through Sources between Streaming and Quality Checks', () => {
		const hrefs = docsNavigation().pages.map((item) => item.href);
		const streaming = hrefs.indexOf('/docs/guides/streaming');
		expect(hrefs[streaming + 1]).toBe('/docs/guides/sources');
		expect(hrefs[streaming + 2]).toBe('/docs/guides/quality-checks');
	});
});
