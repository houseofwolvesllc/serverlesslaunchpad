/**
 * Dashboard Home Component
 *
 * Default landing page for the dashboard when no specific route is selected.
 * Displays a welcome message and basic information about the application.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const DashboardHome = () => {
    return (
        <div className="container max-w-4xl py-8">
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Welcome to Serverless Launchpad</CardTitle>
                        <CardDescription className="text-lg">
                            Get started by selecting an option from the navigation menu.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Additional content can be added here */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
