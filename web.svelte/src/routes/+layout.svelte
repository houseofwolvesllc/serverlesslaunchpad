<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';
	import { themeStore } from '$lib/stores/theme_store';

	// Subscribe to theme store to keep it active for the lifetime of the app.
	// The store applies theme classes to document.documentElement on initialization
	// and on every change, so simply subscribing is sufficient.
	$: void $themeStore;
</script>

<Toaster richColors position="top-right" />

<slot />
