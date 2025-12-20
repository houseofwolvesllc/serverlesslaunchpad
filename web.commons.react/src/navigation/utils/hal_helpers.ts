import type { HalLink, HalObject, HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import type { NavItem, NavGroup } from '../types';

/**
 * Helper to get href from a HalLink (handles both single link and array)
 */
export function getHref(link: HalLink | HalLink[] | undefined): string | undefined {
  if (!link) return undefined;
  if (Array.isArray(link)) return link[0]?.href;
  return link.href;
}

/**
 * Helper to get title from a HalLink (handles both single link and array)
 */
export function getTitle(link: HalLink | HalLink[] | undefined): string | undefined {
  if (!link) return undefined;
  if (Array.isArray(link)) return link[0]?.title;
  return link.title;
}

/**
 * Check if href matches pathname (supporting template parameters)
 */
export function matchesPath(templateHref: string, actualHref: string): boolean {
  // Convert template variables {userId} to regex patterns
  const pattern = templateHref.replace(/\{[^}]+\}/g, '[^/]+');
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(actualHref);
}

/**
 * Extract a title from HAL hypermedia controls (HATEOAS-compliant)
 * Only checks _links.self.title or _templates.self.title, then falls back to href
 */
export function extractTitleFromResource(resource: HalObject, fallbackHref: string): string {
  // Try _links.self.title (for link-based resources)
  const linkTitle = getTitle(resource._links?.self);
  if (linkTitle) return linkTitle;

  // Try _templates.self.title (for template-based resources)
  // Note: Templates have title as a direct property, not nested in a link
  const selfTemplate = (resource as any)._templates?.self;
  if (selfTemplate?.title) return selfTemplate.title;

  // Fall back to deriving from href (only when API provides no title)
  const pathSegments = fallbackHref.split('/').filter(Boolean);
  let lastSegment = pathSegments[pathSegments.length - 1];

  // If last segment is "list", use the resource type from second-to-last segment
  if (lastSegment === 'list' && pathSegments.length > 1) {
    lastSegment = pathSegments[pathSegments.length - 2];
  }

  return lastSegment
    ? lastSegment.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    : 'Resource';
}

/**
 * Find parent groups for a given href by searching the sitemap navigation structure
 */
export function findParentGroups(
  href: string,
  navStructure: (NavItem | NavGroup)[] | undefined,
  links: Record<string, HalLink> | undefined,
  templates: Record<string, HalTemplate> | undefined,
  parentGroups: NavGroup[] = []
): NavGroup[] | undefined {
  if (!navStructure || !links || !templates) {
    return undefined;
  }

  for (const item of navStructure) {
    if ('rel' in item) {
      // NavItem - check if it matches
      const navItem = item as NavItem;
      const itemHref = navItem.type === 'link'
        ? links[navItem.rel]?.href
        : templates[navItem.rel]?.target;

      if (itemHref && matchesPath(itemHref, href)) {
        return parentGroups;
      }
    } else {
      // NavGroup - recurse with this group added to parent chain
      const group = item as NavGroup;
      const result = findParentGroups(
        href,
        group.items,
        links,
        templates,
        [...parentGroups, group]
      );

      if (result) {
        return result;
      }
    }
  }

  return undefined;
}
