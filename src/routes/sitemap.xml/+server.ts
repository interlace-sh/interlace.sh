import type { RequestHandler } from './$types';

export const prerender = true;

const SITE = 'https://interlace.sh';

type PostMeta = { date?: string };

/**
 * The route tree is fully static, so the sitemap is built from the same globs
 * that build the pages — a new .md file appears here by existing, with nothing
 * to register by hand.
 */
const blogModules = import.meta.glob<{ metadata: PostMeta }>('../blog/*/+page.md', { eager: true });
const docsModules = import.meta.glob<{ metadata: PostMeta }>(
	['../docs/+page.md', '../docs/**/+page.md'],
	{ eager: true }
);

/** '../blog/my-post/+page.md' -> '/blog/my-post' */
function routeOf(path: string): string {
	return path.replace(/^\.\./, '').replace(/\/\+page\.md$/, '');
}

function urlEntry(loc: string, lastmod?: string): string {
	const mod = lastmod ? `\n\t\t<lastmod>${lastmod}</lastmod>` : '';
	return `\t<url>\n\t\t<loc>${SITE}${loc}</loc>${mod}\n\t</url>`;
}

export const GET: RequestHandler = () => {
	const entries: string[] = [
		urlEntry('/'),
		urlEntry('/why'),
		urlEntry('/blog'),
		...Object.entries(blogModules).map(([path, mod]) =>
			urlEntry(routeOf(path), mod.metadata?.date)
		),
		...Object.keys(docsModules).map((path) => urlEntry(routeOf(path)))
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=0, s-maxage=3600'
		}
	});
};
