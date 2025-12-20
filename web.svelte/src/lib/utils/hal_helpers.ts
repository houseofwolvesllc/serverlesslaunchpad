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
 * Extract title from a HAL resource (HATEOAS-compliant)
 *
 * Attempts to find a suitable title from hypermedia controls only:
 * 1. _links.self.title (for link-based resources)
 * 2. _templates.self.title (for template-based resources)
 * 3. Fallback to deriving from href path segments
 *
 * @param resource - HAL resource object
 * @param fallbackHref - Fallback href to extract title from
 * @returns Extracted title
 */
export function extractTitleFromResource(resource: HalObject, fallbackHref: string): string {
	// Try _links.self.title (for link-based resources)
	const linkTitle = getTitle(resource._links?.self);
	if (linkTitle) {
		return linkTitle;
	}

	// Try _templates.self.title (for template-based resources)
	// Note: Templates have title as a direct property, not nested in a link
	const selfTemplate = (resource as Record<string, unknown>)._templates as
		| Record<string, { title?: string }>
		| undefined;
	if (selfTemplate?.self?.title) {
		return selfTemplate.self.title;
	}

	// Fall back to deriving from href (only when API provides no title)
	const pathSegments = fallbackHref.split('/').filter(Boolean);
	let lastSegment = pathSegments[pathSegments.length - 1];

	// If last segment is "list", use the resource type from second-to-last segment
	if (lastSegment === 'list' && pathSegments.length > 1) {
		lastSegment = pathSegments[pathSegments.length - 2];
	}

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
