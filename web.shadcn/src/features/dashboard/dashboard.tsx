import { Breadcrumbs } from '@/components/breadcrumbs';
import { LinksGroup } from '@/components/navbar_links_group/navbar_links_group';
import { ThemeToggle } from '@/components/theme_toggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { UserButton } from '@/components/user_button/user_button';
import WebConfigurationStore from '@/configuration/web_config_store';
import { useDisclosure } from '@/hooks/use_disclosure';
import { useHeadroom } from '@/hooks/use_headroom';
import { cn } from '@/lib/utils';
import { generateRoutesFromNavStructure } from '@/routing/route_generator';
import { AlertCircle, ChevronsLeft, ChevronsRight, Code2, HelpCircle, Home, Menu, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { GenericResourceView } from '../resource/generic_resource_view';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import { DashboardHome } from './dashboard_home';

/**
 * Wrapper to force GenericResourceView to remount when path changes
 * This prevents stale state issues when navigating between different resources
 */
function GenericResourceViewWrapper() {
    // GenericResourceView will remount automatically when the route changes
    // due to how React Router handles route elements
    return <GenericResourceView />;
}

function DashboardContent() {
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
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            );
        }

        if (sitemapError) {
            return (
                <Alert variant="default" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Navigation Error</AlertTitle>
                    <AlertDescription>
                        <p className="text-sm mb-2">Failed to load navigation menu.</p>
                        <Button size="sm" variant="outline" onClick={refetch} className="gap-2">
                            <RefreshCw className="w-3 h-3" />
                            Retry
                        </Button>
                    </AlertDescription>
                </Alert>
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
            {/* Branding Section */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg">SL</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">Serverless Launchpad</span>
                        <span className="text-xs text-muted-foreground">shadcn Edition</span>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="py-4">{renderNavigation()}</div>
            </ScrollArea>

            <div className="border-t border-border p-4">
                <UserButton accountNav={accountNav} />
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen">
            {/* Mobile Drawer - Sheet component */}
            <Sheet open={mobileOpened} onOpenChange={toggleMobile}>
                <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
                    <div className="p-4 border-b border-border">
                        <img src="/svg/serverless_launchpad_logo.svg" alt="Serverless Launchpad Logo" className="h-14" />
                    </div>
                    {navigationContent}
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    'hidden md:flex md:flex-col border-r border-border bg-background transition-all duration-300',
                    desktopOpened ? 'md:w-[300px]' : 'md:w-0 md:overflow-hidden'
                )}
            >
                {navigationContent}
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header
                    className={cn(
                        'sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background px-6 transition-transform duration-200',
                        pinned ? 'translate-y-0' : '-translate-y-full'
                    )}
                >
                    {/* Mobile menu toggle */}
                    <Button
                        onClick={toggleMobile}
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        aria-label="Toggle mobile menu"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    {/* Desktop sidebar toggle */}
                    <Button
                        onClick={toggleDesktop}
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex"
                        aria-label={desktopOpened ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        {desktopOpened ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
                    </Button>

                    {/* Breadcrumbs */}
                    <div className="hidden md:flex flex-1">
                        <Breadcrumbs />
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-2 md:ml-auto">
                        {/* Search Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            aria-label="Search"
                            title="Search (coming soon)"
                        >
                            <Search className="h-5 w-5" />
                        </Button>

                        {/* Help Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled
                            aria-label="Help"
                            title="Help (coming soon)"
                        >
                            <HelpCircle className="h-5 w-5" />
                        </Button>

                        {/* Theme Toggle */}
                        <ThemeToggle />
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-muted/30">
                    <div className="p-6">
                        {isSitemapLoading ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <Skeleton className="h-4 w-64" />
                                <Skeleton className="h-4 w-48" />
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

                                {/* Catch-all for HAL resources */}
                                <Route path="*" element={<GenericResourceViewWrapper />} />
                            </Routes>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

/**
 * Dashboard component
 */
export const Dashboard = DashboardContent;
