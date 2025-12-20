import { useEffect, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Home, Code2, ChevronRight, Menu, AlertCircle, RefreshCw } from 'lucide-react';
import { LinksGroup } from '@/components/navbar_links_group/navbar_links_group';
import { NoMatch } from '@/components/no_match';
import { UserButton } from '@/components/user_button/user_button';
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
                        'sticky top-0 z-40 h-[60px] border-b border-border bg-background transition-transform duration-200',
                        pinned ? 'translate-y-0' : '-translate-y-full'
                    )}
                >
                    <div className="h-full px-4 flex items-center gap-2">
                        {/* Mobile menu toggle */}
                        <Button
                            onClick={toggleMobile}
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            aria-label="Toggle mobile menu"
                        >
                            <div
                                className={cn('flex items-center transition-transform duration-250', mobileOpened ? 'rotate-180' : 'rotate-0')}
                            >
                                {mobileOpened ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </div>
                        </Button>

                        {/* Desktop menu toggle */}
                        <Button
                            onClick={toggleDesktop}
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex"
                            aria-label="Toggle desktop sidebar"
                        >
                            <div
                                className={cn('flex items-center transition-transform duration-250', desktopOpened ? 'rotate-180' : 'rotate-0')}
                            >
                                {desktopOpened ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </div>
                        </Button>

                        {/* Logo */}
                        <img src="/svg/serverless_launchpad_logo.svg" alt="Serverless Launchpad Logo" className="h-14" />
                    </div>
                </header>

                {/* Main Content */}
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
        </div>
    );
};
