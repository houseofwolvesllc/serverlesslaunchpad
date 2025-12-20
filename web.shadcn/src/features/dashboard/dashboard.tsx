import { useEffect, useMemo, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Home, Code2, ChevronRight, ChevronsLeft, ChevronsRight, Menu, AlertCircle, RefreshCw, Search, HelpCircle } from 'lucide-react';
import { LinksGroup } from '@/components/navbar_links_group/navbar_links_group';
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
import { generateRoutesFromNavStructure } from '@/routing/route_generator';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import type { NavItem, NavGroup } from '@/hooks/use_navigation';
import { DashboardHome } from './dashboard_home';
import { GenericResourceView } from '../resource/generic_resource_view';
import { BreadcrumbProvider, useBreadcrumb } from '@/context/breadcrumb_context';

function DashboardContent() {
    // Fetch navigation from sitemap API
    const { navigation, navStructure, links, templates, isLoading: isSitemapLoading, error: sitemapError, refetch } = useSitemap();

    const location = useLocation();
    const navigate = useNavigate();
    const { resourceTitle } = useBreadcrumb();
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

    // Generate breadcrumbs from navigation structure
    const breadcrumbs = useMemo(() => {
        const pathname = location.pathname;
        const crumbs: Array<{ label: string; path: string | null; isLast: boolean }> = [
            // Always start with Dashboard
            { label: 'Dashboard', path: '/dashboard', isLast: false }
        ];

        // If we're on the dashboard home, just return dashboard breadcrumb
        if (pathname === '/' || pathname === '/dashboard') {
            crumbs[0].isLast = !resourceTitle;
            if (resourceTitle) {
                crumbs.push({
                    label: resourceTitle,
                    path: null,
                    isLast: true
                });
            }
            return crumbs;
        }

        if (!navStructure || !links || !templates) {
            // Fallback when sitemap not loaded yet
            return crumbs;
        }

        // Helper to resolve NavItem to href
        const resolveHref = (item: NavItem): string | null => {
            if (item.type === 'link') {
                return links[item.rel]?.href || null;
            } else {
                return templates[item.rel]?.target || null;
            }
        };

        // Helper to resolve NavItem to title
        const resolveTitle = (item: NavItem): string => {
            if (item.type === 'link') {
                return item.title || links[item.rel]?.title || item.rel;
            } else {
                return item.title || templates[item.rel]?.title || item.rel;
            }
        };

        // Helper to match pathname against href with template parameters
        const matchesPath = (href: string, pathname: string): boolean => {
            // Convert template variables {userId} to regex patterns
            // e.g., "/users/{userId}/sessions/list" -> "/users/[^/]+/sessions/list"
            const pattern = href.replace(/\{[^}]+\}/g, '[^/]+');
            const regex = new RegExp(`^${pattern}`);
            return regex.test(pathname);
        };

        // Recursively find matching nav item and build parent chain
        interface MatchResult {
            item: NavItem;
            href: string;
            title: string;
            parentChain: Array<{ label: string; path: string | null }>;
        }

        const findMatch = (
            items: (NavItem | NavGroup)[],
            parentChain: Array<{ label: string; path: string | null }> = []
        ): MatchResult | null => {
            let bestMatch: MatchResult | null = null;
            let bestMatchLength = 0;

            for (const item of items) {
                if ('rel' in item) {
                    // NavItem
                    const navItem = item as NavItem;
                    const href = resolveHref(navItem);

                    if (href && matchesPath(href, pathname)) {
                        // Keep the longest (most specific) match
                        const matchLength = href.replace(/\{[^}]+\}/g, '').length;
                        if (matchLength > bestMatchLength) {
                            bestMatch = {
                                item: navItem,
                                href,
                                title: resolveTitle(navItem),
                                parentChain
                            };
                            bestMatchLength = matchLength;
                        }
                    }
                } else {
                    // NavGroup - add to parent chain and recurse
                    const group = item as NavGroup;
                    const result = findMatch(group.items, [
                        ...parentChain,
                        { label: group.title, path: null } // Groups are not clickable
                    ]);
                    if (result) {
                        const matchLength = result.href.replace(/\{[^}]+\}/g, '').length;
                        if (matchLength > bestMatchLength) {
                            bestMatch = result;
                            bestMatchLength = matchLength;
                        }
                    }
                }
            }
            return bestMatch;
        };

        const match = findMatch(navStructure);

        if (match) {
            // Add parent chain (groups and parent pages)
            crumbs.push(...match.parentChain.map(p => ({ ...p, isLast: false })));

            // Add current page
            crumbs.push({
                label: match.title,
                path: resourceTitle ? match.href : null, // Clickable if resource title will be appended
                isLast: !resourceTitle
            });
        } else {
            // Fallback: Extract last segment of path as label
            const segments = pathname.split('/').filter(Boolean);
            const lastSegment = segments[segments.length - 1];

            if (lastSegment) {
                crumbs.push({
                    label: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1),
                    path: null,
                    isLast: !resourceTitle
                });
            }
        }

        // Append resource title if available (from HalResourceDetail)
        if (resourceTitle) {
            crumbs.push({
                label: resourceTitle,
                path: null, // Resource title is never clickable (current page)
                isLast: true
            });
        }

        return crumbs;
    }, [location.pathname, navStructure, links, templates, resourceTitle]);

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
                            return (
                                <div key={`${crumb.path || crumb.label}-${index}`} className="flex items-center space-x-2">
                                    {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                    {crumb.path ? (
                                        // Clickable breadcrumb (has path)
                                        <button
                                            onClick={() => navigate(crumb.path!)}
                                            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                                        >
                                            {index === 0 && <Home className="h-4 w-4" />}
                                            {crumb.label}
                                        </button>
                                    ) : (
                                        // Non-clickable breadcrumb (groups or current page)
                                        <span className={cn(
                                            "flex items-center gap-1.5",
                                            crumb.isLast ? "font-medium text-foreground" : "text-muted-foreground"
                                        )}>
                                            {index === 0 && <Home className="h-4 w-4" />}
                                            {crumb.label}
                                        </span>
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
                        {isSitemapLoading ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <Skeleton className="h-4 w-64" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        ) : (
                            <Routes>
                                {/* Redirect root to dashboard */}
                                <Route index element={<DashboardHome />} />

                                {/* Dashboard home route */}
                                <Route path="dashboard" element={<DashboardHome />} />

                                {/* Dynamic routes from sitemap */}
                                {dynamicRoutes.map((route, index) => (
                                    <Route key={route.path || index} path={route.path} element={route.element} />
                                ))}

                                {/* Catch-all for HAL resources */}
                                <Route path="*" element={<GenericResourceView />} />
                            </Routes>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

/**
 * Dashboard component with breadcrumb context provider
 */
export const Dashboard = () => {
    return (
        <BreadcrumbProvider>
            <DashboardContent />
        </BreadcrumbProvider>
    );
};
