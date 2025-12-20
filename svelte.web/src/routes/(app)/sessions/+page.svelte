<script lang="ts">
	import { onMount } from 'svelte';
	import { createHalResourcePaginated } from '$lib/hooks/use_hal_resource_paginated';
	import { executeTemplate } from '$lib/hooks/use_template';
	import { toastStore } from '$lib/stores/toast_store';
	import { authStore } from '$lib/stores/auth_store';
	import { Clock, RefreshCw, Trash2, Monitor, AlertCircle } from 'lucide-svelte';
	import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
	import Card from '$lib/components/ui/card.svelte';
	import CardHeader from '$lib/components/ui/card-header.svelte';
	import CardContent from '$lib/components/ui/card-content.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Root as AlertDialogRoot } from '$lib/components/ui/alert-dialog.svelte';
	import AlertDialogContent from '$lib/components/ui/alert-dialog-content.svelte';
	import AlertDialogHeader from '$lib/components/ui/alert-dialog-header.svelte';
	import AlertDialogTitle from '$lib/components/ui/alert-dialog-title.svelte';
	import AlertDialogDescription from '$lib/components/ui/alert-dialog-description.svelte';
	import AlertDialogFooter from '$lib/components/ui/alert-dialog-footer.svelte';
	import Table from '$lib/components/ui/table.svelte';
	import TableHeader from '$lib/components/ui/table-header.svelte';
	import TableBody from '$lib/components/ui/table-body.svelte';
	import TableHead from '$lib/components/ui/table-head.svelte';
	import TableRow from '$lib/components/ui/table-row.svelte';
	import TableCell from '$lib/components/ui/table-cell.svelte';
	import Skeleton from '$lib/components/ui/skeleton.svelte';
	import Badge from '$lib/components/ui/badge.svelte';
	import Checkbox from '$lib/components/ui/checkbox.svelte';
	import PaginationControls from '$lib/components/ui/pagination-controls.svelte';
	import { format, formatDistanceToNow } from 'date-fns';
	import { parseUserAgent } from '$lib/utils/parse_user_agent';

	interface Session extends HalObject {
		sessionId: string;
		ipAddress: string;
		userAgent: string;
		lastAccessed: string;
		isCurrent?: boolean;
	}

	let resource = createHalResourcePaginated<HalObject>('sessions', 'sessions_page_size');
	let { pagination } = resource;
	let bulkDeleteModalOpen = false;
	let selectedSessions: Set<string> = new Set();
	let submitting = false;

	onMount(() => {
		resource.init();
	});

	$: data = $resource.data;
	$: loading = $resource.loading;
	$: rawSessions = (data?._embedded?.sessions as Session[]) || [];

	// Get current session ID from auth store
	$: currentSessionId = $authStore.user?.authContext?.sessionId || null;

	// Mark current session based on sessionId from auth context
	$: sessions = rawSessions.map(session => ({
		...session,
		isCurrent: currentSessionId ? session.sessionId === currentSessionId : false
	}));

	$: paginationInfo = $pagination;
	$: bulkDeleteTemplate = data?._templates?.bulkDelete;
	$: deletableSessions = sessions.filter(s => !s.isCurrent);
	$: allSelected = deletableSessions.length > 0 && selectedSessions.size === deletableSessions.length;
	$: someSelected = selectedSessions.size > 0 && selectedSessions.size < deletableSessions.length;

	function toggleAll() {
		if (allSelected) {
			selectedSessions.clear();
		} else {
			selectedSessions = new Set(deletableSessions.map(s => s.sessionId));
		}
		selectedSessions = selectedSessions;
	}

	function toggleSession(sessionId: string) {
		if (selectedSessions.has(sessionId)) {
			selectedSessions.delete(sessionId);
		} else {
			selectedSessions.add(sessionId);
		}
		selectedSessions = selectedSessions;
	}

	async function handleBulkDelete() {
		if (!bulkDeleteTemplate) {
			toastStore.error('Delete operation not available');
			return;
		}

		if (selectedSessions.size === 0) {
			return;
		}

		submitting = true;
		const sessionIds = Array.from(selectedSessions);

		try {
			await executeTemplate(bulkDeleteTemplate, { sessionIds });
			toastStore.success(`${selectedSessions.size} session(s) deleted successfully`);
			bulkDeleteModalOpen = false;
			selectedSessions.clear();
			selectedSessions = selectedSessions;
			resource.refresh();
		} catch (error: any) {
			toastStore.error(error.detail || 'Failed to delete sessions');
		} finally {
			submitting = false;
		}
	}

	function formatDate(dateString: string): string {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return 'Invalid date';
		return format(date, 'MMM d, yyyy h:mm a');
	}

	function formatRelative(dateString: string): string {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return 'Invalid date';
		return formatDistanceToNow(date, { addSuffix: true });
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="space-y-1">
		<h1 class="text-3xl font-bold tracking-tight">Sessions</h1>
		<p class="text-muted-foreground">
			View and manage your active login sessions across all devices
		</p>
	</div>

	<!-- Actions Toolbar -->
	<div class="flex items-center justify-between">
		{#if selectedSessions.size > 0}
			<span class="text-sm font-medium">
				{selectedSessions.size} session(s) selected
			</span>
		{:else}
			<div></div>
		{/if}
		<div class="flex items-center gap-2">
			{#if selectedSessions.size > 0}
				<Button variant="outline" size="sm" class="h-9 px-4" on:click={() => {
					selectedSessions.clear();
					selectedSessions = selectedSessions;
				}}>
					Clear Selection
				</Button>
				{#if bulkDeleteTemplate}
					<Button
						variant="outline"
						size="sm"
						class="h-9 px-4"
						on:click={() => (bulkDeleteModalOpen = true)}
						disabled={submitting}
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete Selected
					</Button>
				{/if}
			{/if}
			<Button variant="outline" size="sm" class="h-9 px-4" on:click={() => resource.refresh()}>
				<RefreshCw class="mr-2 h-4 w-4" />
				Refresh
			</Button>
		</div>
	</div>

	<!-- Sessions Table -->
	{#if loading}
		<Card>
			<CardContent class="p-6">
				<div class="space-y-4">
					{#each Array(3) as _}
						<div class="flex items-center gap-4">
							<div class="flex-1 space-y-2">
								<Skeleton class="h-5 w-40" />
								<Skeleton class="h-4 w-32" />
								<Skeleton class="h-4 w-48" />
							</div>
							<Skeleton class="h-9 w-20" />
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{:else if sessions.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<Clock class="h-12 w-12 text-muted-foreground mb-4" />
				<h3 class="text-lg font-semibold mb-2">No Sessions</h3>
				<p class="text-sm text-muted-foreground">No active sessions found.</p>
			</CardContent>
		</Card>
	{:else}
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead class="w-12">
							<Checkbox
								checked={allSelected}
								indeterminate={someSelected}
								onCheckedChange={toggleAll}
								aria-label="Select all sessions"
							/>
						</TableHead>
						<TableHead>Device & Browser</TableHead>
						<TableHead>IP Address</TableHead>
						<TableHead>Last Accessed</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each sessions as session (session.sessionId)}
						{@const userAgentInfo = parseUserAgent(session.userAgent)}
						<TableRow class={session.isCurrent ? 'bg-primary/5' : ''}>
							<TableCell>
								{#if !session.isCurrent}
									<Checkbox
										checked={selectedSessions.has(session.sessionId)}
										onCheckedChange={() => toggleSession(session.sessionId)}
										aria-label={`Select session ${session.sessionId}`}
									/>
								{/if}
							</TableCell>
							<TableCell>
								<div class="flex items-center justify-between">
									<div class="flex flex-col space-y-1">
										<div class="flex items-center gap-2">
											<Monitor class="h-4 w-4 text-muted-foreground" />
											<span class="font-medium">{userAgentInfo.browser}</span>
										</div>
										<span class="text-sm text-muted-foreground">
											{userAgentInfo.os} • {userAgentInfo.device}
										</span>
									</div>
									{#if session.isCurrent}
										<Badge variant="default" class="bg-emerald-500 hover:bg-emerald-600 ml-2">
											Current Session
										</Badge>
									{/if}
								</div>
							</TableCell>
							<TableCell>
								<code class="text-sm font-mono bg-muted px-2 py-1 rounded">
									{session.ipAddress}
								</code>
							</TableCell>
							<TableCell>
								<div class="flex flex-col space-y-1">
									<span class="text-sm">{formatDate(session.lastAccessed)}</span>
									<span class="text-xs text-muted-foreground">
										{formatRelative(session.lastAccessed)}
									</span>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>

		<!-- Pagination Controls -->
		{#if sessions.length > 0}
			<PaginationControls
				hasNext={paginationInfo.hasNext}
				hasPrevious={paginationInfo.hasPrevious}
				pageSize={paginationInfo.pageSize}
				onNextPage={() => resource.nextPage()}
				onPreviousPage={() => resource.previousPage()}
				onPageSizeChange={(size) => resource.changePageSize(size)}
				disabled={loading}
			/>
		{/if}
	{/if}

	<!-- Security Information Card -->
	<Card class="border-primary/20 bg-primary/5">
		<CardHeader>
			<div class="flex items-center gap-2">
				<AlertCircle class="h-5 w-5 text-primary" />
				<h3 class="font-semibold">Security Information</h3>
			</div>
		</CardHeader>
		<CardContent class="space-y-2">
			<p class="text-sm text-muted-foreground">
				Each session represents a device where you're currently signed in. If you notice any
				unfamiliar sessions, you should delete them immediately and change your password.
			</p>
			<p class="text-sm text-muted-foreground">
				<strong>Note:</strong> You cannot delete your current session. To end your current session,
				please sign out using the user menu.
			</p>
		</CardContent>
	</Card>
</div>

<!-- Bulk Delete Confirmation Dialog -->
<AlertDialogRoot bind:open={bulkDeleteModalOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete Multiple Sessions</AlertDialogTitle>
			<AlertDialogDescription>
				Are you sure you want to delete {selectedSessions.size} session(s)? Users will need to sign in again on
				those devices. This action cannot be undone.
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<Button
				variant="outline"
				on:click={() => {
					bulkDeleteModalOpen = false;
				}}
			>
				Cancel
			</Button>
			<Button
				variant="destructive"
				on:click={async (e) => {
					e.preventDefault();
					await handleBulkDelete();
				}}
				disabled={submitting}
			>
				{submitting ? 'Deleting...' : `Delete ${selectedSessions.size} Session(s)`}
			</Button>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialogRoot>
