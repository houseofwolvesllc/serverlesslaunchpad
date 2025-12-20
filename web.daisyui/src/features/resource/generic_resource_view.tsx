/**
 * GenericResourceView - Catch-all router for HAL resources
 *
 * This component acts as a catch-all route handler that:
 * - Fetches HAL resources from any path
 * - Auto-detects collections vs single resources
 * - Renders HalCollectionList for collections
 * - Renders a simple view for single resources
 * - Handles template execution with HATEOAS response-based navigation
 */

import { HalCollectionList } from '@/components/hal_collection';
import { HalResourceDetail } from '@/components/hal_resource';
import { NoMatch } from '@/components/no_match';
import { useHalResource } from '@/hooks/use_hal_resource';
import { useHalResourceTracking } from '@/hooks/use_hal_resource_tracking_adapter';
import { halClient } from '@/lib/hal_forms_client';
import { isCollection } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import { useMemo } from 'react';

/**
 * Generic resource view component that handles any HAL resource
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
    const { data, loading, error, refetch } = useHalResource(urlToFetch, template);

    useHalResourceTracking(data);

    const isCollectionView = isCollection(data);

    const handleTemplateExecute = async (template: HalTemplate, formData: Record<string, any>) => {
        try {
            const result = await halClient.executeTemplate(template, formData);

            const selfLink = result._links?.self;
            const resultSelfHref = Array.isArray(selfLink) ? selfLink[0]?.href : selfLink?.href;
            const currentPath = `/${resourcePath}`;

            if (resultSelfHref && resultSelfHref !== currentPath) {
                const targetPath = resultSelfHref.replace(/^\//, '');
                navigate(`/${targetPath}`);
                return;
            }

            const resultIsCollection = isCollection(result);
            if (resultIsCollection && template.target) {
                const targetPath = template.target.replace(/^\//, '');
                const targetFullPath = `/${targetPath}`;
                if (targetFullPath !== currentPath) {
                    navigate(targetFullPath);
                    return;
                }
            }

            await refetch();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Operation failed';
            toast.error(message);
            throw err;
        }
    };

    const handleRefresh = async () => {
        await refetch();
    };

    const handleRowClick = (item: any) => {
        const selfHref = item._links?.self?.href;
        if (selfHref) {
            const path = selfHref.replace(/^\//, '');
            navigate(`/${path}`);
        }
    };

    if (error) {
        return <NoMatch />;
    }

    const isLoading = isSitemapLoading || loading;

    if (isCollectionView) {
        return (
            <HalCollectionList
                resource={data}
                onRefresh={handleRefresh}
                onRowClick={handleRowClick}
            />
        );
    } else {
        return (
            <HalResourceDetail
                resource={data}
                loading={isLoading}
                error={error ? new Error(error) : null}
                onRefresh={handleRefresh}
                onTemplateExecute={handleTemplateExecute}
            />
        );
    }
}
