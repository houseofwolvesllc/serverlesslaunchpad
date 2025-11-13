/**
 * Dashboard Home Component
 *
 * Default landing page showing personalized greeting, quick actions, and account info.
 * Matches the UX of svelte.web dashboard.
 */

import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Clock, LogOut, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/authentication/hooks/use_auth';
import { AuthenticationContext } from '@/features/authentication/context/authentication_context';
import { toast } from 'sonner';
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
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">
                    {get_greeting()}{first_name ? `, ${first_name}` : ''}!
                </h1>
                <p className="text-lg text-muted-foreground">
                    Welcome to your dashboard. Here's an overview of your account.
                </p>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-2xl font-semibold tracking-tight mb-4">Quick Actions</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Clock className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-semibold">Manage Sessions</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                View and manage your active login sessions across devices.
                            </p>
                            <Button
                                className="w-full"
                                onClick={() => sessions_href && navigate(sessions_href)}
                                disabled={!sessions_href}
                            >
                                Manage Sessions
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Key className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-semibold">Manage API Keys</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Generate and manage API keys for programmatic access.
                            </p>
                            <Button
                                className="w-full"
                                onClick={() => api_keys_href && navigate(api_keys_href)}
                                disabled={!api_keys_href}
                            >
                                Manage API Keys
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                                    <LogOut className="h-5 w-5 text-destructive" />
                                </div>
                                <h3 className="font-semibold">Logout</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Sign out of your account and end your current session.
                            </p>
                            <Button variant="destructive" className="w-full" onClick={handle_logout}>
                                Logout
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Account Information */}
            <Card>
                <CardHeader>
                    <h2 className="text-2xl font-semibold tracking-tight">Account Information</h2>
                </CardHeader>
                <CardContent>
                    <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">Username</dt>
                            <dd className="text-base font-semibold">{username}</dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">Email Address</dt>
                            <dd className="text-base font-semibold">{signedInUser?.email}</dd>
                        </div>
                        <div className="space-y-1">
                            <dt className="text-sm font-medium text-muted-foreground">Account Type</dt>
                            <dd className="text-base font-semibold">Standard</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
    );
};
