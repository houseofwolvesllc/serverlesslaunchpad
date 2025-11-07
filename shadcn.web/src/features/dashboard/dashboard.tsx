import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Home, Code2, ChevronRight, ChevronsLeft, ChevronsRight, Menu, AlertCircle, RefreshCw, Search, HelpCircle } from 'lucide-react';
import { LinksGroup } from '@/components/navbar_links_group/navbar_links_group';
import { NoMatch } from '@/components/no_match';
import { UserButton } from '@/components/user_button/user_button';
import { ThemeToggle } from '@/components/theme_toggle';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useDisclosure } from '@/hooks/use_disclosure';
import { useHeadroom } from '@/hooks/use_headroom';
import WebConfigurationStore from '@/configuration/web_config_store';
import { generateRoutesFromSitemap } from '@/routing/route_generator';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import { DashboardHome } from './dashboard_home';

export const Dashboard = () => {
    // Fetch navigation from sitemap API
    const { navigation, rawItems, isLoading: isSitemapLoading, error: sitemapError, refetch } = useSitemap();

    const location = useLocation();
    const navigate = useNavigate();
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

    // Generate breadcrumbs from current path and navigation
    const breadcrumbs = useMemo(() => {
        const pathname = location.pathname;
        const crumbs: Array<{ label: string; path: string }> = [
            // Always start with Dashboard
            { label: 'Dashboard', path: '/dashboard' }
        ];

        // If we're on the dashboard home, just return dashboard breadcrumb
        if (pathname === '/' || pathname === '/dashboard') {
            return crumbs;
        }

        // Recursively search navigation items to find one whose href matches the current path
        const findNavItemByHref = (items: any[], targetPath: string): any => {
            for (const item of items) {
                // Check if this item's href matches the current path
                if (item.href && targetPath.includes(item.href)) {
                    return item;
                }
                // Also try without leading slash
                const normalizedHref = item.href?.startsWith('/') ? item.href.slice(1) : item.href;
                const normalizedPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath;
                if (normalizedHref && normalizedPath.includes(normalizedHref)) {
                    return item;
                }
                // Check nested items
                if (item.items) {
                    const found = findNavItemByHref(item.items, targetPath);
                    if (found) return found;
                }
            }
            return null;
        };

        // Try to find a navigation item that matches the current path
        const navItem = findNavItemByHref(rawItems || [], pathname);

        if (navItem) {
            // Use the navigation item's label and current full path
            crumbs.push({
                label: navItem.title,
                path: pathname
            });
        }

        return crumbs;
    }, [location.pathname, rawItems]);

    // Generate dynamic routes from sitemap
    const dynamicRoutes = useMemo(() => {
        if (!rawItems || rawItems.length === 0) {
            return [];
        }
        return generateRoutesFromSitemap(rawItems);
    }, [rawItems]);

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
                        <span className="text-xs text-muted-foreground">shadcn/ui Edition</span>
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
                    <nav aria-label="Breadcrumb" className="hidden md:flex items-center space-x-2 text-sm flex-1">
                        {breadcrumbs.map((crumb, index) => {
                            const is_last = index === breadcrumbs.length - 1;
                            return (
                                <div key={crumb.path} className="flex items-center space-x-2">
                                    {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                    {is_last ? (
                                        <span className="font-medium text-foreground flex items-center gap-1.5">
                                            {index === 0 && <Home className="h-4 w-4" />}
                                            {crumb.label}
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => navigate(crumb.path)}
                                            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                                        >
                                            {index === 0 && <Home className="h-4 w-4" />}
                                            {crumb.label}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

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
                    <div className="container mx-auto p-6">
                        <Routes>
                            {/* Redirect root to dashboard */}
                            <Route index element={<DashboardHome />} />

                            {/* Dashboard home route */}
                            <Route path="dashboard" element={<DashboardHome />} />

                            {/* Dynamic routes from sitemap */}
                            {dynamicRoutes.map((route, index) => (
                                <Route key={route.path || index} path={route.path} element={route.element} />
                            ))}

                            {/* Fallback for unknown routes */}
                            <Route path="*" element={<NoMatch />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
};
