/**
 * GenericResourceView - Catch-all router for HAL resources
 *
 * This component acts as a catch-all route handler that:
 * - Fetches HAL resources from any path
 * - Auto-detects collections vs single resources
 * - Renders HalCollectionList or HalResourceDetail accordingly
 * - Handles template execution with categorization-based navigation
 * - Only navigates for navigation templates (self, next, prev, collection)
 * - Form and action templates are handled by child components
 */

import { HalCollectionList } from '@/components/hal_collection';
import { HalResourceDetail } from '@/components/hal_resource';
import { NoMatch } from '@/components/no_match';
import { useHalResource } from '@/hooks/use_hal_resource';
import { halClient } from '@/lib/hal_forms_client';
import { isCollection, categorizeTemplate } from '@houseofwolves/serverlesslaunchpad.web.commons';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { HalTemplate } from '@houseofwolves/serverlesslaunchpad.types/hal';

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
     * Simplified navigation using template categorization:
     * - Navigation templates: navigate to template.target
     * - Form templates: refresh in place (handled by child components)
     * - Action templates: refresh in place (handled by child components)
     */
    const handleTemplateExecute = async (template: HalTemplate, formData: Record<string, any>) => {
        try {
            // Find template key for categorization (check both resource templates)
            const templateKey = Object.keys(data?._templates || {}).find(
                key => data?._templates?.[key] === template
            ) || '';

            const category = categorizeTemplate(templateKey, template);

            // Execute the template
            await halClient.executeTemplate(template, formData);

            // Handle navigation based on category
            if (category === 'navigation' && template.target) {
                // Navigation templates: navigate to target
                const targetPath = template.target.replace(/^\//, '');
                navigate(`/${targetPath}`);
            } else {
                // Form and action templates: handled by child components
                // (they show dialogs/confirmations and refresh on success)
                // This case shouldn't be reached as child components handle these
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

    // Render appropriate component based on resource type
    if (isCollectionView) {
        return (
            <HalCollectionList
                resource={data}
                onRefresh={handleRefresh}
                onTemplateExecute={handleTemplateExecute}
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

