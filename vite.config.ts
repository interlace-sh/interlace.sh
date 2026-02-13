import tailwindcss from '@tailwindcss/vite';
import twAutoReference from 'vite-plugin-tailwind-autoreference';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), twAutoReference({ cssRoot: 'src/routes/layout.css' }), tailwindcss()]
});
