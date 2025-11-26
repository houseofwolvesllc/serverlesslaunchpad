import type { PageLoad } from './$types';

/**
 * Load function for catch-all resource route
 *
 * The resource path is extracted from params.resource
 * All data fetching happens in the component using reactive statements
 */
export const load: PageLoad = async ({ params }) => {
	// Extract the resource path from the catch-all parameter
	// params.resource will be a string like "users/123" or "api-keys"
	const resourcePath = params.resource || '';

	return {
		resourcePath
	};
};
