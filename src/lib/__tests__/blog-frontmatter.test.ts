import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load } from '../../routes/blog/+page';

/**
 * The blog listing is built from each post's frontmatter by
 * `src/routes/blog/+page.ts`, and the post page repeats the title and date in a
 * `<BlogHeader>` call. Nothing enforces that those agree, and they have drifted
 * before — the listing once carried a title and excerpt the post had moved on
 * from, which is why the listing was changed to glob the posts.
 *
 * These assert the contract that keeps that from happening again.
 */

const BLOG = join(process.cwd(), 'src/routes/blog');

const postDirs = readdirSync(BLOG, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && existsSync(join(BLOG, entry.name, '+page.md')))
	.map((entry) => entry.name);

type Post = {
	slug: string;
	frontmatter: Record<string, string>;
	body: string;
};

const posts: Post[] = postDirs.map((slug) => {
	const raw = readFileSync(join(BLOG, slug, '+page.md'), 'utf-8');
	const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
	if (!match) throw new Error(`${slug}: no frontmatter block`);

	const frontmatter: Record<string, string> = {};
	for (const line of match[1].split('\n')) {
		const kv = /^([a-z]+):\s*(.*)$/.exec(line);
		if (kv) frontmatter[kv[1]] = kv[2];
	}
	return { slug, frontmatter, body: match[2] };
});

const unquote = (value: string) => value.replace(/^['"]|['"]$/g, '');

describe('blog frontmatter', () => {
	it('finds the posts', () => {
		expect(posts.length).toBeGreaterThan(0);
	});

	it.each(posts)('$slug has the fields the listing reads', ({ frontmatter }) => {
		// PageMeta in src/routes/blog/+page.ts requires all three.
		expect(unquote(frontmatter.title ?? '')).not.toBe('');
		expect(unquote(frontmatter.excerpt ?? '')).not.toBe('');
		expect(frontmatter.date).toBeDefined();
	});

	it.each(posts)('$slug quotes its date as an ISO string', ({ frontmatter }) => {
		// The listing sorts with b.date.localeCompare(a.date). An unquoted
		// 2026-08-01 is parsed by YAML into a Date, which has no localeCompare,
		// so the sort throws or silently misorders depending on the loader.
		expect(frontmatter.date).toMatch(/^'\d{4}-\d{2}-\d{2}'$/);
	});

	it.each(posts)('$slug repeats the same title and date in BlogHeader', ({ frontmatter, body }) => {
		const header = /<BlogHeader\s+title="([^"]*)"\s+date="([^"]*)"\s*\/>/.exec(body);
		expect(header, 'no <BlogHeader title=… date=… /> in the body').not.toBeNull();
		expect(header![1]).toBe(unquote(frontmatter.title));
		expect(header![2]).toBe(unquote(frontmatter.date));
	});

	it('has no two posts on the same date', () => {
		// Same-date posts have unspecified relative order under localeCompare, so
		// the listing would shuffle between builds.
		const dates = posts.map((p) => unquote(p.frontmatter.date));
		expect(new Set(dates).size).toBe(dates.length);
	});

	it('has no two posts on consecutive-equal dates that would shuffle', () => {
		const dates = posts.map((p) => unquote(p.frontmatter.date));
		expect(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
	});
});

describe('blog listing loader', () => {
	// Exercises src/routes/blog/+page.ts for real: the glob, the slug derivation
	// and the sort, against the actual posts and mdsvex's frontmatter export.
	const { posts: listed } = load({} as Parameters<typeof load>[0]) as {
		posts: Array<{ slug: string; title: string; date: string; excerpt: string }>;
	};

	it('finds every post directory', () => {
		expect([...listed.map((p) => p.slug)].sort()).toEqual([...postDirs].sort());
	});

	it('derives the slug from the directory, not the file', () => {
		for (const post of listed) {
			expect(post.slug).not.toContain('/');
			expect(post.slug).not.toBe('+page.md');
		}
	});

	it('surfaces the frontmatter mdsvex parsed', () => {
		for (const post of listed) {
			expect(typeof post.title).toBe('string');
			expect(typeof post.excerpt).toBe('string');
			// A Date here means the frontmatter date lost its quotes — localeCompare
			// below would throw, or silently misorder under a lenient loader.
			expect(typeof post.date).toBe('string');
		}
	});

	it('orders newest first', () => {
		const dates = listed.map((p) => p.date);
		expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)));
		expect(dates[0]).toBe([...dates].sort().at(-1));
	});
});
