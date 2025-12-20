import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			fallback: 'index.html', // SPA mode - all routes fall back to index.html
		}),
		alias: {
			$lib: 'src/lib',
		},
	},
};

export default config;
