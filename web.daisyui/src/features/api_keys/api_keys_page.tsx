/**
 * API Keys Page
 *
 * Displays API keys with page header and description.
 * Matches shadcn layout structure.
 */

import { ApiKeysList } from './components/api_keys_list';
import { useApiKeys } from './hooks/use_api_keys';
import { useHalResourceTracking } from '../../hooks/use_hal_resource_tracking_adapter';

export const ApiKeysPage = () => {
    const { data } = useApiKeys();

    // Track navigation for breadcrumbs
    useHalResourceTracking(data);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
                <p className="text-base-content/70">
                    Manage your API keys for programmatic access to your resources
                </p>
            </div>

            {/* API Keys List */}
            <ApiKeysList />
        </div>
    );
};
