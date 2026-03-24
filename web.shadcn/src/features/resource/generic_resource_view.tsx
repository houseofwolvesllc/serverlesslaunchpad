/**
 * GenericResourceView - Catch-all router for HAL resources
 *
 * This component acts as a catch-all route handler that:
 * - Fetches HAL resources from any path
 * - Auto-detects collections vs single resources
 * - Renders HalCollectionList or HalResourceDetail accordingly
 * - Handles template execution with HATEOAS response-based navigation
 * - Lets server response guide navigation (self links, collection detection)
 * - Form and action templates are handled by child components
 */

import { HalCollectionList } from '@/components/hal_collection';
import { HalResourceDetail } from '@/components/hal_resource';
import { NoMatch } from '@/components/no_match';
import { useHalResource } from '@/hooks/use_hal_resource';
import { useHalResourceTracking } from '@/hooks/use_hal_resource_tracking_adapter';
import { halClient } from '@/lib/hal_forms_client';
import { isCollection } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { useLocation, useNavigate } from 'react-router-dom';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import { useMemo } from 'react';

/**
 * Generic resource view component that handles any HAL resource
 *
 * Detects whether the resource is a collection or single resource and
 * renders the appropriate component.
 *
 * Handles both GET (links) and POST (templates) by discovering from sitemap.
 */
export function GenericResourceView() {
    const location = useLocation();
    const navigate = useNavigate();
    const { templates, isLoading: isSitemapLoading } = useSitemap();

    // Extract path from location (remove leading slash)
    const resourcePath = location.pathname.startsWith('/')
        ? location.pathname.substring(1)
        : location.pathname;

    // Match current URL against sitemap to determine if it's a link or template
    const template = useMemo(() => {
        if (!templates) return undefined;

        // Check if current path matches any template target
        const currentPath = `/${resourcePath}`;

        for (const [_key, tmpl] of Object.entries(templates)) {
            if (tmpl.target === currentPath) {
                return tmpl;
            }
        }

        return undefined;
    }, [templates, resourcePath]);

    // Wait for sitemap to load before fetching resource
    // This ensures we know whether to GET or POST
    const shouldFetch = !isSitemapLoading;
    const urlToFetch = shouldFetch ? `/${resourcePath}` : null;

    // Fetch resource using path
    // If template found in sitemap, use POST; otherwise use GET
    const { data, loading, refreshing, error, refetch } = useHalResource(urlToFetch, template);

    // Track this resource in navigation history
    useHalResourceTracking(data);

    // Detect if this is a collection
    const isCollectionView = isCollection(data);

    // Extract page title from self link or template
    const pageTitle = useMemo(() => {
        // First try self link title
        const selfLink = data?._links?.self;
        const selfTitle = Array.isArray(selfLink) ? selfLink[0]?.title : selfLink?.title;
        if (selfTitle) return selfTitle;

        // Then try template title
        if (template?.title) return template.title;

        return null;
    }, [data, template]);

    /**
     * Handle template execution with HATEOAS-based navigation
     *
     * Follows hypermedia principles: let the server response guide navigation
     * instead of pre-determining it from the request.
     *
     * Navigation rules based on response:
     * 1. Response has different self link → navigate to new resource location
     * 2. Response is collection from detail view → navigate to collection endpoint
     * 3. Otherwise (update, pagination) → no-op here, caller handles refresh
     *
     * Note: This handler does NOT refetch for in-place updates (case 3).
     * Child components (HalResourceDetail, HalCollectionList) call onRefresh()
     * after template execution to perform a single data refresh.
     */
    const handleTemplateExecute = async (template: HalTemplate, formData: Record<string, any>) => {
        // Execute the template and get the result
        const result = await halClient.executeTemplate(template, formData);

        // HATEOAS: Inspect response to determine navigation
        // Normalize paths by stripping trailing slashes for comparison
        const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/';

        // 1. Check if result has a self link different from current location
        const selfLink = result._links?.self;
        const resultSelfHref = Array.isArray(selfLink) ? selfLink[0]?.href : selfLink?.href;
        const currentPath = normalizePath(`/${resourcePath}`);

        if (resultSelfHref && normalizePath(resultSelfHref) !== currentPath) {
            const targetPath = resultSelfHref.replace(/^\//, '');
            navigate(`/${targetPath}`);
            return;
        }

        // 2. Check if result is a collection and target is different from current path
        const resultIsCollection = isCollection(result);

        if (resultIsCollection && template.target) {
            const targetPath = template.target.replace(/^\//, '');
            const targetFullPath = normalizePath(`/${targetPath}`);

            if (targetFullPath !== currentPath) {
                navigate(`/${targetPath}`);
                return;
            }
        }

        // 3. Default: Same resource updated or pagination in collection view
        // Do NOT refetch here — the calling component (HalResourceDetail or
        // HalCollectionList) calls onRefresh() after this handler returns,
        // which triggers a single data refresh without double-fetching.
    };

    /**
     * Handle successful refresh
     */
    const handleRefresh = async () => {
        await refetch();
    };

    /**
     * Handle row click (navigate to detail view)
     */
    const handleRowClick = (item: any) => {
        // Find the self link or construct path from ID
        const selfHref = item._links?.self?.href;
        if (selfHref) {
            const path = selfHref.replace(/^\//, '');
            navigate(`/${path}`);
        }
    };

    // Error state - show NoMatch for 404s
    if (error) {
        return <NoMatch />;
    }

    // Combined loading state (sitemap + resource)
    const isLoading = isSitemapLoading || loading;

    // Render appropriate component based on resource type
    if (isCollectionView) {
        return (
            <HalCollectionList
                resource={data}
                onRefresh={handleRefresh}
                onTemplateExecute={handleTemplateExecute}
                onRowClick={handleRowClick}
                title={pageTitle || undefined}
                refreshing={refreshing}
            />
        );
    } else {
        return (
            <HalResourceDetail
                resource={data}
                loading={isLoading}
                refreshing={refreshing}
                error={error ? new Error(error) : null}
                onRefresh={handleRefresh}
                onTemplateExecute={handleTemplateExecute}
            />
        );
    }
}

