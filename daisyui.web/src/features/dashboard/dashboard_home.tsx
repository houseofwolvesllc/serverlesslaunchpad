/**
 * Dashboard Home Component
 *
 * Default landing page for the dashboard when no specific route is selected.
 * Displays a welcome message and basic information about the application.
 */

export const DashboardHome = () => {
    return (
        <div className="container max-w-4xl py-8">
            <div className="flex flex-col gap-6">
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title text-3xl">Welcome to Serverless Launchpad</h2>
                        <p className="text-lg opacity-70">
                            Get started by selecting an option from the navigation menu.
                        </p>
                        {/* Additional content can be added here */}
                    </div>
                </div>
            </div>
        </div>
    );
};
