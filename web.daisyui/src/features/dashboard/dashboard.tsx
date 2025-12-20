import { useEffect, useMemo, useRef, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Home, Code2, ChevronRight, Menu, AlertCircle, RefreshCw, Search, HelpCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme_toggle';
import { LinksGroup } from '@/components/navbar_links_group/navbar_links_group';
import { UserButton } from '@/components/user_button/user_button';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { cn } from '@/lib/utils';
import { useDisclosure } from '@/hooks/use_disclosure';
import { useHeadroom } from '@/hooks/use_headroom';
import WebConfigurationStore from '@/configuration/web_config_store';
import { generateRoutesFromNavStructure } from '@/routing/route_generator';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import { DashboardHome } from './dashboard_home';
import { GenericResourceView } from '../resource/generic_resource_view';

/**
 * Wrapper to force GenericResourceView to remount when path changes
 * This prevents stale state issues when navigating between different resources
 */
function GenericResourceViewWrapper() {
    // GenericResourceView will remount automatically when the route changes
    // due to how React Router handles route elements
    return <GenericResourceView />;
}

export const Dashboard = () => {
    // Fetch navigation from sitemap API
    const { navigation, navStructure, links, templates, isLoading: isSitemapLoading, error: sitemapError, refetch } = useSitemap();

    const location = useLocation();
    const navigate = useNavigate();
    const pinned = useHeadroom({ fixedAt: 120 });
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
    const [apiBaseUrl, setApiBaseUrl] = useState<string>('');

    // Track if this is the initial page load
    const isInitialLoad = useRef(true);

    // Redirect to dashboard on direct URL navigation (refresh, bookmark, direct entry)
    // This enforces pure HATEOAS navigation - users must start from dashboard and follow links
    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false;

            // If initial load and not on dashboard, redirect
            if (location.pathname !== '/dashboard' && location.pathname !== '/') {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [location.pathname, navigate]);

    // Load API base URL for documentation link
    useEffect(() => {
        WebConfigurationStore.getConfig().then((config) => {
            setApiBaseUrl(config.api.base_url);
        });
    }, []);

    // Generate dynamic routes from sitemap
    const dynamicRoutes = useMemo(() => {
        if (!navStructure || navStructure.length === 0 || !links || !templates) {
            return [];
        }
        return generateRoutesFromNavStructure(navStructure, links, templates);
    }, [navStructure, links, templates]);

    // Split navigation into main nav (root items + groups except "My Account") and account nav
    const accountNav = navigation.find((item) => item.label === 'My Account');
    const mainNav = navigation.filter((item) => item.label !== 'My Account');

    // Render main navigation links or loading/error state
    const renderNavigation = () => {
        if (isSitemapLoading) {
            return (
                <div className="flex flex-col gap-3">
                    <div className="skeleton h-10 w-full"></div>
                    <div className="skeleton h-10 w-full"></div>
                    <div className="skeleton h-10 w-full"></div>
                </div>
            );
        }

        if (sitemapError) {
            return (
                <div role="alert" className="alert alert-error mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <div>
                        <h3 className="font-bold">Navigation Error</h3>
                        <div className="text-sm">
                            <p className="mb-2">Failed to load navigation menu.</p>
                            <button onClick={refetch} className="btn btn-sm border border-base-300 bg-base-100 hover:bg-base-200 gap-2">
                                <RefreshCw className="w-3 h-3" />
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <>
                <LinksGroup icon={Home} label="Home" link="/" />
                {apiBaseUrl && <LinksGroup icon={Code2} label="Hypermedia API Documentation" link={apiBaseUrl} newTab={true} />}
                {mainNav.map((item) => (
                    <LinksGroup {...item} key={item.label} />
                ))}
            </>
        );
    };

    // Reusable navigation content
    const navigationContent = (
        <>
            <div className="flex-1 overflow-y-auto">
                <div className="p-4">{renderNavigation()}</div>
            </div>
            <div className="border-t border-base-300 p-4">
                <UserButton accountNav={accountNav} />
            </div>
        </>
    );

    return (
        <div className="drawer lg:drawer-open">
            <input id="dashboard-drawer" type="checkbox" className="drawer-toggle" checked={mobileOpened} onChange={toggleMobile} />

            {/* Main Content Area */}
            <div className="drawer-content flex flex-col">
                {/* Navbar */}
                <div
                    className={cn(
                        'navbar bg-base-100 border-b border-base-300 sticky top-0 z-40 transition-transform duration-200',
                        pinned ? 'translate-y-0' : '-translate-y-full'
                    )}
                >
                    {/* Mobile menu toggle */}
                    <div className="flex-none lg:hidden">
                        <label htmlFor="dashboard-drawer" className="btn btn-square btn-ghost" aria-label="Toggle mobile menu">
                            <div
                                className={cn('flex items-center transition-transform duration-250', mobileOpened ? 'rotate-180' : 'rotate-0')}
                            >
                                {mobileOpened ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </div>
                        </label>
                    </div>

                    {/* Desktop menu toggle */}
                    <div className="flex-none hidden lg:block">
                        <button
                            onClick={toggleDesktop}
                            className="btn btn-square btn-ghost"
                            aria-label="Toggle desktop sidebar"
                        >
                            <div
                                className={cn('flex items-center transition-transform duration-250', desktopOpened ? 'rotate-180' : 'rotate-0')}
                            >
                                {desktopOpened ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </div>
                        </button>
                    </div>

                    {/* Breadcrumbs */}
                    <div className="flex-1 px-2 hidden md:flex">
                        <Breadcrumbs />
                    </div>

                    {/* Right side actions */}
                    <div className="flex-none flex items-center gap-1">
                        {/* Search Icon (disabled) */}
                        <span
                            className="w-12 h-12 flex items-center justify-center opacity-40 cursor-not-allowed"
                            aria-label="Search"
                            title="Search (coming soon)"
                        >
                            <Search className="h-5 w-5" />
                        </span>

                        {/* Help Icon (disabled) */}
                        <span
                            className="w-12 h-12 flex items-center justify-center opacity-40 cursor-not-allowed"
                            aria-label="Help"
                            title="Help (coming soon)"
                        >
                            <HelpCircle className="h-5 w-5" />
                        </span>

                        {/* Theme Toggle */}
                        <ThemeToggle />
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1 p-4 bg-muted/30 min-h-[calc(100vh-64px)]">
                    {isSitemapLoading ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                            <span className="loading loading-spinner loading-lg"></span>
                            <div className="skeleton h-4 w-64"></div>
                            <div className="skeleton h-4 w-48"></div>
                        </div>
                    ) : (
                        <Routes key={location.pathname}>
                            {/* Redirect root to dashboard */}
                            <Route index element={<DashboardHome />} />

                            {/* Dashboard home route */}
                            <Route path="dashboard" element={<DashboardHome />} />

                            {/* Dynamic routes from sitemap */}
                            {dynamicRoutes.map((route, index) => (
                                <Route key={route.path || index} path={route.path} element={route.element} />
                            ))}

                            {/* Catch-all for HAL resources (users, my-profile, etc.) */}
                            <Route path="*" element={<GenericResourceViewWrapper />} />
                        </Routes>
                    )}
                </main>
            </div>

            {/* Sidebar */}
            <div className="drawer-side">
                <label htmlFor="dashboard-drawer" className="drawer-overlay"></label>
                <aside
                    className={cn(
                        'bg-base-100 min-h-full flex flex-col border-r border-base-300 transition-all duration-300',
                        desktopOpened ? 'w-[300px]' : 'lg:w-0 lg:overflow-hidden w-[300px]'
                    )}
                >
                    {/* Branding */}
                    <div className="p-4 border-b border-base-300">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-lg">SL</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm">Serverless Launchpad</span>
                                <span className="text-xs text-base-content/70">DaisyUI Edition</span>
                            </div>
                        </div>
                    </div>
                    {navigationContent}
                </aside>
            </div>
        </div>
    );
};
