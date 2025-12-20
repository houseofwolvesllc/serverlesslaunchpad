<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';
	import { ModeWatcher } from 'mode-watcher';
</script>

<ModeWatcher />
<Toaster richColors position="top-right" />

<slot />
