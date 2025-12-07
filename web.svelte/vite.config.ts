import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5176,
		strictPort: true,
		fs: {
			// Allow serving files from the project root (includes config directory)
			allow: ['..']
		}
	},
	clearScreen: false, // Preserve terminal scrollback history
});
