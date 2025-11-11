/**
 * GenericResourceView - Catch-all router for HAL resources
 *
 * This component acts as a catch-all route handler that:
 * - Fetches HAL resources from any path
 * - Auto-detects collections vs single resources
 * - Renders HalCollectionList or HalResourceDetail accordingly
 * - Handles template execution with proper navigation
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { isCollection } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { useHalResource } from '@/hooks/use_hal_resource';
import { HalCollectionList } from '@/components/hal_collection';
import { HalResourceDetail } from '@/components/hal_resource';
import { halClient } from '@/lib/hal_forms_client';
import { toast } from 'sonner';
import { NoMatch } from '@/components/no_match';

/**
 * Generic resource view component that handles any HAL resource
 *
 * Detects whether the resource is a collection or single resource and
 * renders the appropriate component.
 */
export function GenericResourceView() {
    const location = useLocation();
    const navigate = useNavigate();

    // Extract path from location (remove leading slash)
    const resourcePath = location.pathname.startsWith('/')
        ? location.pathname.substring(1)
        : location.pathname;

    // Fetch resource using path
    const { data, loading, error, refetch } = useHalResource(`/${resourcePath}`);

    // Detect if this is a collection
    const isCollectionView = isCollection(data);

    /**
     * Handle template execution with navigation logic
     *
     * Navigation rules:
     * - If Location header present → navigate to that URL
     * - If DELETE method → navigate to parent collection
     * - Otherwise → refresh current page
     */
    const handleTemplateExecute = async (template: any, formData: any) => {
        try {
            const result = await halClient.executeTemplate(template, formData);

            // Show success message
            toast.success(template.title || 'Operation successful');

            // Navigate based on result
            if (result.locationHeader) {
                // Navigate to Location header URL
                const newPath = result.locationHeader.replace(/^\//, '');
                navigate(`/${newPath}`);
            } else if (template.method === 'DELETE') {
                // Navigate to parent collection (remove last path segment)
                const parentPath = getParentPath(resourcePath);
                navigate(`/${parentPath}`);
            } else {
                // Refresh current page
                await refetch();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Operation failed';
            toast.error(message);
            throw err;
        }
    };

    /**
     * Handle successful refresh
     */
    const handleRefresh = async () => {
        await refetch();
        toast.success('Refreshed');
    };

    /**
     * Handle successful create (navigate to parent list)
     */
    const handleCreate = async () => {
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

    /**
     * Handle bulk delete
     */
    const handleBulkDelete = async (selectedIds: string[]) => {
        toast.info(`Bulk delete not yet implemented for ${selectedIds.length} items`);
        // TODO: Implement bulk delete logic
    };

    // Error state - show NoMatch for 404s
    if (error) {
        return <NoMatch />;
    }

    // Render appropriate component based on resource type
    if (isCollectionView) {
        return (
            <HalCollectionList
                resource={data}
                onRefresh={handleRefresh}
                onCreate={handleCreate}
                onBulkDelete={handleBulkDelete}
                onRowClick={handleRowClick}
            />
        );
    } else {
        return (
            <HalResourceDetail
                resource={data}
                loading={loading}
                error={error ? new Error(error) : null}
                onRefresh={handleRefresh}
                onTemplateExecute={handleTemplateExecute}
            />
        );
    }
}

/**
 * Get the parent path by removing the last segment
 *
 * @example
 * getParentPath('users/123/sessions/456') // 'users/123/sessions'
 * getParentPath('users/123') // 'users'
 * getParentPath('users') // ''
 */
function getParentPath(path: string): string {
    const segments = path.split('/').filter(Boolean);
    if (segments.length <= 1) {
        return '';
    }
    return segments.slice(0, -1).join('/');
}
