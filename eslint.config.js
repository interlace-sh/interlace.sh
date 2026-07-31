import prettier from 'eslint-config-prettier';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
export default [
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		// Svelte files use `<script lang="ts">`, so they need the TS parser nested
		// inside svelte-eslint-parser to be linted at all.
		files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				extraFileExtensions: ['.svelte'],
				svelteConfig
			}
		},
		rules: {
			// Svelte template tags like `{@html a + b}` parse as bare expression
			// statements, which this rule flags as unused. Not applicable in markup.
			'@typescript-eslint/no-unused-expressions': 'off'
		}
	},
	{
		rules: {
			// The site is served from the root of the interlace.sh apex domain, so
			// `base` is empty and resolve() is an identity function on every link.
			// Re-enable this if a base path is ever configured in svelte.config.js.
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
];
