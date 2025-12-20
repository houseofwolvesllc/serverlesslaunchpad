import { useEffect, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Home, Code2, ChevronRight, Menu, AlertCircle, RefreshCw } from 'lucide-react';
import { LinksGroup } from '@/components/navbar_links_group/navbar_links_group';
import { NoMatch } from '@/components/no_match';
import { UserButton } from '@/components/user_button/user_button';
import { cn } from '@/lib/utils';
import { useDisclosure } from '@/hooks/use_disclosure';
import { useHeadroom } from '@/hooks/use_headroom';
import WebConfigurationStore from '@/configuration/web_config_store';
import { generateRoutesFromNavStructure } from '@/routing/route_generator';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import { DashboardHome } from './dashboard_home';

export const Dashboard = () => {
    // Fetch navigation from sitemap API
    const { navigation, navStructure, links, templates, isLoading: isSitemapLoading, error: sitemapError, refetch } = useSitemap();

    const pinned = useHeadroom({ fixedAt: 120 });
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
    const [apiBaseUrl, setApiBaseUrl] = useState<string>('');

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
                            <button onClick={refetch} className="btn btn-sm btn-outline gap-2">
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

                    {/* Logo */}
                    <div className="flex-1 px-2">
                        <img src="/svg/serverless_launchpad_logo.svg" alt="Serverless Launchpad Logo" className="h-14" />
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1 p-4">
                    <Routes>
                        {/* Home/default route */}
                        <Route index element={<DashboardHome />} />

                        {/* Dynamic routes from sitemap */}
                        {dynamicRoutes.map((route, index) => (
                            <Route key={route.path || index} path={route.path} element={route.element} />
                        ))}

                        {/* Fallback for unknown routes */}
                        <Route path="*" element={<NoMatch />} />
                    </Routes>
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
                    <div className="p-4 border-b border-base-300">
                        <img src="/svg/serverless_launchpad_logo.svg" alt="Serverless Launchpad Logo" className="h-14" />
                    </div>
                    {navigationContent}
                </aside>
            </div>
        </div>
    );
};
