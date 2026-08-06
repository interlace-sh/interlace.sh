/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import twAutoReference from 'vite-plugin-tailwind-autoreference';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), twAutoReference({ cssRoot: 'src/routes/layout.css' }), tailwindcss()],
	test: {
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text-summary', 'cobertura'],
			reportsDirectory: 'coverage',
			// Scoped to the files that hold logic. Including .svelte would report a
			// large percentage that says nothing — this repo is mostly markup, and
			// the markup is covered by the build and by svelte-check.
			include: ['src/lib/**/*.ts', 'src/routes/**/*.ts'],
			exclude: ['**/*.test.ts', '**/*.d.ts']
		}
	}
});
