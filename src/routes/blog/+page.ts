import type { PageLoad } from './$types';

export type PostMeta = {
	title: string;
	date: string;
	author?: string;
	excerpt: string;
};

/**
 * Build the listing from each post's own frontmatter, so a post is registered
 * simply by existing. Previously title/date/excerpt were duplicated here and
 * drifted from the markdown.
 */
export const load: PageLoad = () => {
	const modules = import.meta.glob<{ metadata: PostMeta }>('./*/+page.md', { eager: true });

	const posts = Object.entries(modules)
		.map(([path, module]) => ({
			// './my-post/+page.md' -> 'my-post'
			slug: path.split('/')[1],
			...module.metadata
		}))
		.sort((a, b) => b.date.localeCompare(a.date));

	return { posts };
};
