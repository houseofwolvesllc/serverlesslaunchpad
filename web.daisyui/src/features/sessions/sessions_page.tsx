/**
 * Sessions Page
 *
 * Displays user sessions with page header, description, and security information.
 * Matches shadcn layout structure.
 */

import { AlertCircle } from 'lucide-react';
import { SessionsList } from './components/sessions_list';
import { useSessions } from './hooks/use_sessions';
import { useHalResourceTracking } from '../../hooks/use_hal_resource_tracking_adapter';

export const SessionsPage = () => {
    const { data } = useSessions();

    // Track navigation for breadcrumbs
    useHalResourceTracking(data);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
                <p className="text-base-content/70">
                    View and manage your active login sessions across all devices
                </p>
            </div>

            {/* Sessions List */}
            <SessionsList />

            {/* Security Information Card */}
            <div className="card bg-primary/5 border border-primary/20">
                <div className="card-body">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Security Information</h3>
                    </div>
                    <p className="text-sm text-base-content/70">
                        Each session represents a device where you're currently signed in. If you notice any
                        unfamiliar sessions, you should delete them immediately and change your password.
                    </p>
                    <p className="text-sm text-base-content/70">
                        <strong>Note:</strong> You cannot delete your current session. To end your current session,
                        please sign out using the user menu.
                    </p>
                </div>
            </div>
        </div>
    );
};
