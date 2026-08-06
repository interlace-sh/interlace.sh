import { describe, it, expect } from 'vitest';
import * as rootLayout from '../../routes/+layout';

/**
 * Asserts against the real `src/routes/+layout.ts`, not a copy of the value.
 * The site ships on adapter-static with no fallback, so the whole tree has to
 * be prerenderable; flipping this off breaks the deploy rather than degrading
 * it. The build catches that too — this states the intent at the file a
 * contributor would actually edit.
 */
describe('app shell', () => {
	it('prerenders the entire route tree', () => {
		expect(rootLayout.prerender).toBe(true);
	});
});
