import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { HalObject } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { PagingInstructions, PagingInstruction } from '@houseofwolves/serverlesslaunchpad.types/pagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, type PageSize } from '@houseofwolves/serverlesslaunchpad.types/pagination';
import { halClient } from '$lib/hal_forms_client';
import { logger } from '$lib/logging';
import { getEntryPoint } from '$lib/services/entry_point_provider';

export interface HalResourcePaginatedState<T extends HalObject = HalObject> {
	data: T | null;
	loading: boolean;
	error: Error | null;
	pagingInstructions: PagingInstructions | null;
	pageSize: PageSize;
	historyStack: PagingInstruction[];
	currentInstruction: PagingInstruction | null;
}

export interface PaginationInfo {
	hasNext: boolean;
	hasPrevious: boolean;
	pageSize: PageSize;
}

/**
 * Hook for fetching and managing paginated HAL resources with cursor-based pagination
 *
 * Uses POST requests with paging instructions in the body to fetch paginated data.
 * Supports forward/backward navigation with history tracking.
 * Discovers the actual endpoint from the sitemap using the template name.
 *
 * @param templateName - The name of the template to discover from the sitemap (e.g., 'sessions', 'api-keys')
 * @param storageKey - Key for localStorage to persist page size preference
 * @returns Writable store with resource state and pagination functions
 */
export function createHalResourcePaginated<T extends HalObject = HalObject>(
	templateName: string,
	storageKey: string
) {
	// Load saved page size from localStorage (only in browser)
	const loadPageSize = (): PageSize => {
		if (!browser) return DEFAULT_PAGE_SIZE;

		const saved = localStorage.getItem(storageKey);
		if (saved) {
			const parsed = parseInt(saved, 10) as PageSize;
			if (PAGE_SIZE_OPTIONS.includes(parsed)) {
				return parsed;
			}
		}
		return DEFAULT_PAGE_SIZE;
	};

	const initialState: HalResourcePaginatedState<T> = {
		data: null,
		loading: false,
		error: null,
		pagingInstructions: null,
		pageSize: loadPageSize(),
		historyStack: [],
		currentInstruction: null,
	};

	const { subscribe, set, update } = writable<HalResourcePaginatedState<T>>(initialState);

	let endpointUrl: string | null = null;

	async function discoverEndpoint(): Promise<string> {
		if (endpointUrl) return endpointUrl;

		try {
			const entryPoint = getEntryPoint();
			const target = await entryPoint.getTemplateTarget(templateName);

			if (!target) {
				throw new Error(`Template '${templateName}' not found in sitemap`);
			}

			endpointUrl = target;
			return target;
		} catch (error: any) {
			logger.error('Failed to discover endpoint', { templateName, error: error.message });
			throw error;
		}
	}

	async function fetchData(pagingInstruction?: PagingInstruction) {
		update(state => ({ ...state, loading: true, error: null }));

		try {
			// Discover the endpoint if not yet discovered
			const url = await discoverEndpoint();

			logger.info('Fetching paginated HAL resource', { url, templateName, pagingInstruction });

			// Build POST body with paging instruction
			const body: any = {};
			if (pagingInstruction) {
				body.pagingInstruction = pagingInstruction;
			} else {
				// Initial load - use current page size
				update(state => {
					body.pagingInstruction = { limit: state.pageSize };
					return state;
				});
			}

			const data = await halClient.post(url, body);

			update(state => ({
				...state,
				data: data as T,
				pagingInstructions: (data as any).paging || null,
				loading: false,
				error: null,
			}));

			logger.info('Paginated HAL resource fetched successfully', { url, templateName });
		} catch (error: any) {
			logger.error('Failed to fetch paginated HAL resource', { templateName, error: error.message });

			update(state => ({
				...state,
				loading: false,
				error,
			}));
		}
	}

	async function nextPage() {
		update(state => {
			if (state.pagingInstructions?.next) {
				// Push current instruction to history before moving forward
				if (state.currentInstruction) {
					state.historyStack.push(state.currentInstruction);
				}
				state.currentInstruction = state.pagingInstructions.next;
				fetchData(state.pagingInstructions.next);
			}
			return state;
		});
	}

	async function previousPage() {
		update(state => {
			if (state.historyStack.length > 0) {
				// Pop from history stack
				const previousInstruction = state.historyStack.pop()!;
				state.currentInstruction = previousInstruction;
				fetchData(previousInstruction);
			} else if (state.currentInstruction) {
				// Go back to page 1 (no instruction, just page size)
				state.currentInstruction = null;
				fetchData({ limit: state.pageSize });
			}
			return state;
		});
	}

	async function changePageSize(newSize: PageSize) {
		update(state => {
			state.pageSize = newSize;
			state.historyStack = [];
			state.currentInstruction = null;
			if (browser) {
				localStorage.setItem(storageKey, newSize.toString());
			}
			fetchData({ limit: newSize });
			return state;
		});
	}

	async function refresh() {
		update(state => {
			if (state.pagingInstructions?.current) {
				fetchData(state.pagingInstructions.current);
			} else {
				fetchData({ limit: state.pageSize });
			}
			return state;
		});
	}

	// Create derived store for pagination info
	const pagination = derived({ subscribe }, ($state): PaginationInfo => ({
		hasNext: !!$state.pagingInstructions?.next,
		hasPrevious: $state.historyStack.length > 0 || !!$state.currentInstruction,
		pageSize: $state.pageSize,
	}));

	// Initialization function to be called from component onMount
	function init() {
		if (browser) {
			fetchData();
		}
	}

	return {
		subscribe,
		pagination,
		nextPage,
		previousPage,
		changePageSize,
		refresh,
		init,
	};
}
