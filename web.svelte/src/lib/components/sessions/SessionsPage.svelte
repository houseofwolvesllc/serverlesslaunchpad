<script lang="ts">
	import { Clock, AlertCircle, Trash2 } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { HalCollectionList } from '$lib/components/hal_collection';
	import type { FieldRenderer } from '$lib/components/hal_collection';
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
	import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';

	import { page } from '$app/stores';

	// Required prop - the HAL resource fetched by the generic route
	// This resource contains the correct _templates with proper target URLs
	export let resource: HalObject;

	// Optional refresh callback - called after bulk operations
	export let onRefresh: (() => void) | undefined = undefined;

	// Extract userId from URL if present (e.g., /users/123/sessions or /users/123/sessions/list)
	$: userIdFromUrl = $page.url.pathname.match(/^\/users\/([^\/]+)\/sessions/)?.[1];

	let deleteModalOpen = false;
	let selectedIds: string[] = [];

	$: currentSessionId = $authStore.user?.authContext?.sessionId || null;
	$: currentUserId = $authStore.user?.username || null;

	// Determine if viewing own sessions (no userId in URL, or userId matches current user)
	$: isViewingOwnSessions = !userIdFromUrl || userIdFromUrl === currentUserId;

	// Create enhanced data with isCurrent field properly set
	// Use a function to ensure Svelte detects all dependencies
	function enhanceSessionsData(raw: HalObject | null, sessionId: string | null, viewingOwnSessions: boolean) {
		if (!raw) return null;

		const sessions = (raw._embedded?.sessions || []).map((s: any) => ({
			...s,
			// Mark as current only if viewing own sessions AND sessionId matches
			isCurrent: viewingOwnSessions && !!sessionId && s.sessionId === sessionId
		}));

		return {
			...raw,
			_embedded: {
				...raw._embedded,
				sessions
			}
		};
	}

	// Reactive data that depends on resource, currentSessionId, and isViewingOwnSessions
	$: data = enhanceSessionsData(resource, currentSessionId, isViewingOwnSessions);

	function handleBulkDelete(ids: string[]) {
		selectedIds = ids;
		deleteModalOpen = true;
	}

	async function confirmBulkDelete() {
		// Use templates from the passed resource - these have the correct target URLs
		const bulkDeleteTemplate = data?._templates?.['bulk-delete'] || data?._templates?.bulkDelete;
		if (!bulkDeleteTemplate) return;

		try {
			await executeTemplate(bulkDeleteTemplate, { sessionIds: selectedIds });
			toastStore.success(`Deleted ${selectedIds.length} session(s)`);
			deleteModalOpen = false;
			onRefresh?.();
		} catch (error) {
			toastStore.error('Failed to delete sessions');
		}
	}

	// Custom renderer for user agent field
	const userAgentRenderer: FieldRenderer = (value, _column, item) => {
		const deviceInfo = parseUserAgent(value);
		const isCurrent = item.isCurrent || false;

		// Lock icon SVG for current session
		const lockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary flex-shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

		return {
			html: `
				<div class="flex items-center gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground flex-shrink-0"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
					<div class="flex flex-col gap-0.5">
						<span class="text-sm font-medium">${deviceInfo.browser}</span>
						<span class="text-xs text-muted-foreground">
							${deviceInfo.os} • ${deviceInfo.device}
						</span>
					</div>
					${isCurrent ? `${lockIcon}<span class="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20 flex-shrink-0">Current</span>` : ''}
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

<div class="space-y-6">
	<!-- Page Header -->
	<div class="space-y-1">
		<h1 class="text-3xl font-bold tracking-tight">Sessions</h1>
		<p class="text-base-content/70">
			View and manage your active login sessions across all devices
		</p>
	</div>

	<HalCollectionList
		resource={data}
		onRefresh={onRefresh}
		bulkOperations={[
			{
				id: 'delete',
				label: 'Delete Selected',
				icon: Trash2,
				variant: 'destructive',
				handler: handleBulkDelete,
			},
		]}
		primaryKey="sessionId"
		columnConfig={{
			sessionId: { hidden: true },
			userId: { hidden: true },
			isCurrent: { hidden: true },
			userAgent: { label: 'Device & Browser' },
			ipAddress: { label: 'IP Address' },
			dateLastAccessed: { label: 'Last Accessed' }
		}}
		customRenderers={{
			userAgent: userAgentRenderer,
			dateLastAccessed: dateLastAccessedRenderer
		}}
		selectableFilter={(item) => !item.isCurrent}
		emptyMessage="No active sessions found."
		emptyIcon={Clock}
		showCreateButton={false}
	/>

	<!-- Security Information Card -->
	<div class="rounded-xl border bg-primary/5 border-primary/20 p-6">
		<div class="flex items-center gap-2 mb-3">
			<AlertCircle class="h-5 w-5 text-primary" />
			<h3 class="font-semibold">Security Information</h3>
		</div>
		<p class="text-sm text-muted-foreground mb-2">
			Each session represents a device where you're currently signed in. If you notice any
			unfamiliar sessions, you should delete them immediately and change your password.
		</p>
		<p class="text-sm text-muted-foreground">
			<strong class="text-foreground">Note:</strong> You cannot delete your current session. To end your current session,
			please sign out using the user menu.
		</p>
	</div>

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
