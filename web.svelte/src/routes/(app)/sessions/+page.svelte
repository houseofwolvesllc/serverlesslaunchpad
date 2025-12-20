<script lang="ts">
	import { Clock, Monitor } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { HalCollectionList } from '$lib/components/hal_collection';
	import type { FieldRenderer } from '$lib/components/hal_collection';
	import { createHalResource } from '$lib/hooks/use_hal_resource';
	import { executeTemplate } from '$lib/hooks/use_template';
	import { toastStore } from '$lib/stores/toast_store';
	import { authStore } from '$lib/stores/auth_store';
	import { parseUserAgent } from '$lib/utils/parse_user_agent';
	import { Root as AlertDialogRoot } from '$lib/components/ui/alert-dialog.svelte';
	import AlertDialogContent from '$lib/components/ui/alert-dialog-content.svelte';
	import AlertDialogHeader from '$lib/components/ui/alert-dialog-header.svelte';
	import AlertDialogTitle from '$lib/components/ui/alert-dialog-title.svelte';
	import AlertDialogDescription from '$lib/components/ui/alert-dialog-description.svelte';
	import AlertDialogFooter from '$lib/components/ui/alert-dialog-footer.svelte';
	import Button from '$lib/components/ui/button.svelte';

	let resource = createHalResource('sessions');
	let deleteModalOpen = false;
	let selectedIds: string[] = [];

	$: data = $resource.data;
	$: currentSessionId = $authStore.user?.authContext?.sessionId || null;

	// Mark current session in embedded items
	$: if (data?._embedded?.sessions && currentSessionId) {
		data._embedded.sessions = data._embedded.sessions.map((s: any) => ({
			...s,
			isCurrent: s.sessionId === currentSessionId
		}));
	}

	function handleBulkDelete(ids: string[]) {
		selectedIds = ids;
		deleteModalOpen = true;
	}

	async function confirmBulkDelete() {
		const bulkDeleteTemplate = data?._templates?.bulkDelete;
		if (!bulkDeleteTemplate) return;

		try {
			await executeTemplate(bulkDeleteTemplate, { sessionIds: selectedIds });
			toastStore.success(`Deleted ${selectedIds.length} session(s)`);
			deleteModalOpen = false;
			resource.refresh();
		} catch (error) {
			toastStore.error('Failed to delete sessions');
		}
	}

	// Custom renderer for user agent field
	const userAgentRenderer: FieldRenderer = (value, _column, item) => {
		const deviceInfo = parseUserAgent(value);
		const isCurrent = item.isCurrent || false;

		return {
			html: `
				<div class="flex items-center justify-between gap-4">
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content/50"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
							<span class="text-sm font-medium">${deviceInfo.browser}</span>
						</div>
						<span class="text-xs text-base-content/70">
							${deviceInfo.os} • ${deviceInfo.device}
						</span>
					</div>
					${isCurrent ? '<span class="badge badge-success badge-sm flex-shrink-0">Current Session</span>' : ''}
				</div>
			`
		};
	};

	// Custom renderer for last accessed (relative time)
	const dateLastAccessedRenderer: FieldRenderer = (value) => {
		if (!value) {
			return { html: '<span class="text-sm text-base-content/50">Never</span>' };
		}

		const date = new Date(value);
		const relative = formatDistanceToNow(date, { addSuffix: true });
		return {
			html: `<span class="text-sm" title="${date.toLocaleString()}">${relative}</span>`
		};
	};
</script>

<div class="container mx-auto p-6">
	<h1 class="text-3xl font-bold mb-6">Active Sessions</h1>

	<HalCollectionList
		resource={data}
		onRefresh={() => resource.refresh()}
		onBulkDelete={handleBulkDelete}
		primaryKey="sessionId"
		columnConfig={{
			userAgent: { label: 'Device & Browser' },
			ipAddress: { label: 'IP Address' },
			dateLastAccessed: { label: 'Last Accessed' }
		}}
		customRenderers={{
			userAgent: userAgentRenderer,
			dateLastAccessed: dateLastAccessedRenderer
		}}
		emptyMessage="No active sessions found."
		emptyIcon={Clock}
		showCreateButton={false}
	/>

	<!-- Delete Confirmation -->
	<AlertDialogRoot bind:open={deleteModalOpen}>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>Delete Sessions?</AlertDialogTitle>
				<AlertDialogDescription>
					Are you sure you want to delete {selectedIds.length} session(s)? This action cannot be
					undone.
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<Button variant="outline" on:click={() => (deleteModalOpen = false)}>Cancel</Button>
				<Button variant="destructive" on:click={confirmBulkDelete}>Delete</Button>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialogRoot>
</div>
