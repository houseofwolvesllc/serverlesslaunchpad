/**
 * HAL Helper Utilities
 *
 * Helper functions for working with HAL links, templates, and resources.
 */

import type { HalObject, HalLink } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { logger } from '$lib/logging';

/**
 * Get href from a HAL link (handles both single link and array)
 *
 * @param link - HAL link or array of links
 * @returns The href string, or undefined if not found
 */
export function getHref(link: HalLink | HalLink[] | undefined): string | undefined {
	if (!link) return undefined;
	if (Array.isArray(link)) return link[0]?.href;
	return link.href;
}

/**
 * Get title from a HAL link (handles both single link and array)
 *
 * @param link - HAL link or array of links
 * @returns The title string, or undefined if not found
 */
export function getTitle(link: HalLink | HalLink[] | undefined): string | undefined {
	if (!link) return undefined;
	if (Array.isArray(link)) return link[0]?.title;
	return link.title;
}

/**
 * Extract title from a HAL resource
 *
 * Attempts to find a suitable title from:
 * 1. self link title
 * 2. resource.title property
 * 3. resource.name property
 * 4. Fallback to path segment from href
 *
 * @param resource - HAL resource object
 * @param fallbackHref - Fallback href to extract title from
 * @returns Extracted title
 */
export function extractTitleFromResource(resource: HalObject, fallbackHref: string): string {
	// Try self link title
	const selfTitle = getTitle(resource._links?.self);
	if (selfTitle) {
		return selfTitle;
	}

	// Try resource properties
	if ('title' in resource && typeof resource.title === 'string') {
		return resource.title;
	}

	if ('name' in resource && typeof resource.name === 'string') {
		return resource.name;
	}

	// Fallback: extract from href
	const pathSegments = fallbackHref.split('/').filter(Boolean);
	const lastSegment = pathSegments[pathSegments.length - 1];

	if (lastSegment) {
		// Convert kebab-case or snake_case to Title Case
		return lastSegment
			.split(/[-_]/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	return 'Resource';
}

/**
 * Match template href with actual href (supports URI template parameters)
 *
 * @param templateHref - Template href with {param} placeholders
 * @param actualHref - Actual href to match
 * @returns True if the actual href matches the template pattern
 */
export function matchesPath(templateHref: string, actualHref: string): boolean {
	// Convert template to regex pattern
	// e.g., "/users/{userId}/api-keys" -> /^\/users\/[^\/]+\/api-keys$/
	const regexPattern = templateHref.replace(/\{[^}]+\}/g, '[^/]+');
	const regex = new RegExp(`^${regexPattern}$`);

	const matches = regex.test(actualHref);

	logger.debug('[matchesPath]', {
		templateHref,
		actualHref,
		regexPattern,
		matches
	});

	return matches;
}

/**
 * Ensure resource has a self link
 *
 * If the resource doesn't have a self link, adds one with the provided href and title.
 *
 * @param resource - HAL resource
 * @param href - Href for the self link
 * @param title - Optional title for the self link
 * @returns Resource with self link
 */
export function ensureSelfLink(resource: HalObject, href: string, title?: string): HalObject {
	if (resource._links?.self) {
		return resource;
	}

	const selfTitle = title || extractTitleFromResource(resource, href);

	return {
		...resource,
		_links: {
			...resource._links,
			self: {
				href,
				title: selfTitle
			}
		}
	};
}
