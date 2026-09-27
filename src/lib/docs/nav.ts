/**
 * Docs navigation from each page's frontmatter (`title`, `section`, `order`).
 * The sidebar and the prev/next pager both read this, so a new page cannot
 * show up in one and not the other.
 */
export type DocsPageMeta = {
	title: string;
	description?: string;
	section?: string;
	order?: number;
	/** The docs index only redirects; it is not a page in the nav. */
	nav?: boolean;
};

export type DocsNavItem = {
	href: string;
	label: string;
};

export type DocsNavGroup = {
	title: string;
	items: DocsNavItem[];
};

const SECTION_TITLES: Record<string, string> = {
	'getting-started': 'Getting Started',
	'core-concepts': 'Core Concepts',
	guides: 'Guides',
	reference: 'Reference'
};

const SECTION_ORDER = ['getting-started', 'core-concepts', 'guides', 'reference'];

type DocsModule = { metadata: DocsPageMeta };

const modules = import.meta.glob<DocsModule>('../../routes/docs/**/+page.md', { eager: true });

export type DocsPage = DocsPageMeta & { href: string };

export function docsPages(): DocsPage[] {
	return Object.entries(modules).map(([path, module]) => ({
		href: path.replace(/^.*\/routes/, '').replace(/\/\+page\.md$/, '') || '/docs',
		...module.metadata
	}));
}

export function docsNavigation(): { groups: DocsNavGroup[]; pages: DocsNavItem[] } {
	const listed = docsPages()
		.filter((page) => page.nav !== false && page.section && page.order !== undefined)
		.sort((a, b) => {
			const section = SECTION_ORDER.indexOf(a.section!) - SECTION_ORDER.indexOf(b.section!);
			return section || (a.order ?? 0) - (b.order ?? 0);
		});

	const groups = SECTION_ORDER.map((section) => ({
		title: SECTION_TITLES[section],
		items: listed
			.filter((page) => page.section === section)
			.map((page) => ({ href: page.href, label: page.title }))
	})).filter((group) => group.items.length > 0);

	return { groups, pages: groups.flatMap((group) => group.items) };
}
