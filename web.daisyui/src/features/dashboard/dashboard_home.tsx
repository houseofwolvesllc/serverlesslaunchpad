/**
 * Dashboard Home Component
 *
 * Default landing page showing personalized greeting, quick actions, and account info.
 * Matches the UX of shadcn dashboard.
 */

import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Key, LogOut, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../authentication/hooks/use_auth';
import { AuthenticationContext } from '../authentication/context/authentication_context';
import { useSitemap } from '../sitemap/hooks/use_sitemap';

export const DashboardHome = () => {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { signedInUser } = useContext(AuthenticationContext);
    const { links, templates } = useSitemap();

    const username = signedInUser?.username || signedInUser?.email || 'User';
    const first_name = signedInUser?.firstName;

    // Resolve link/template href by rel
    const getHref = (rel: string): string | null => {
        // Check links first
        if (links && links[rel]) {
            return links[rel].href;
        }
        // Check templates
        if (templates && templates[rel]) {
            return templates[rel].target;
        }
        return null;
    };

    const sessions_href = getHref('sessions');
    const api_keys_href = getHref('api-keys');

    // Greeting based on time of day
    const get_greeting = (): string => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const handle_logout = async () => {
        try {
            await signOut();
            toast.success('Logged out successfully');
            navigate('/auth/signin');
        } catch (error) {
            toast.error('Failed to logout');
        }
    };

    return (
        <div className="container max-w-7xl py-8">
            <div className="space-y-8">
                {/* Welcome Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">
                        {get_greeting()}{first_name ? `, ${first_name}` : ''}!
                    </h1>
                    <p className="text-lg text-base-content/70">
                        Welcome to your dashboard. Here's an overview of your account.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Quick Actions</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="card-body">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Clock className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold">Manage Sessions</h3>
                                </div>
                                <p className="text-sm text-base-content/70 mb-4">
                                    View and manage your active login sessions across devices.
                                </p>
                                <button
                                    className="btn btn-primary w-full"
                                    onClick={() => sessions_href && navigate(sessions_href)}
                                    disabled={!sessions_href}
                                >
                                    Manage Sessions
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="card-body">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Key className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold">Manage API Keys</h3>
                                </div>
                                <p className="text-sm text-base-content/70 mb-4">
                                    Generate and manage API keys for programmatic access.
                                </p>
                                <button
                                    className="btn btn-primary w-full"
                                    onClick={() => api_keys_href && navigate(api_keys_href)}
                                    disabled={!api_keys_href}
                                >
                                    Manage API Keys
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="card-body">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
                                        <LogOut className="h-5 w-5 text-error" />
                                    </div>
                                    <h3 className="font-semibold">Logout</h3>
                                </div>
                                <p className="text-sm text-base-content/70 mb-4">
                                    Sign out of your account and end your current session.
                                </p>
                                <button className="btn btn-error w-full" onClick={handle_logout}>
                                    Logout
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Information */}
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="text-2xl font-semibold mb-4">Account Information</h2>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-base-content/70">Username</div>
                                <div className="text-base font-semibold">{username}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-base-content/70">Email Address</div>
                                <div className="text-base font-semibold">{signedInUser?.email}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-base-content/70">Account Type</div>
                                <div className="text-base font-semibold">Standard</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
