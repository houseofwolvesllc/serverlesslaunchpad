import { ActionIcon, Alert, AppShell, Box, Button, Group, ScrollArea, Skeleton, Stack, Text, rem } from '@mantine/core';
import { useDisclosure, useHeadroom } from '@mantine/hooks';
import { IconAlertCircle, IconChevronLeft, IconChevronRight, IconHelp, IconHome, IconMenu2, IconRefresh, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useRef } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LinksGroup } from '../../components/navbar_links_group/navbar_links_group';
import { UserButton } from '../../components/user_button/user_button';
import { Breadcrumbs } from '../../components/breadcrumbs';
import { generateRoutesFromNavStructure } from '../../routing/route_generator';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import classes from './dashboard.module.css';
import { DashboardHome } from './dashboard_home';
import { GenericResourceView } from '../resource/generic_resource_view';
import { HelpPage } from '../help/help_page';
import { HelpTopicDetail } from '../help/help_topic_detail';
import { SettingsPage } from '../settings/settings_page';

export const Dashboard = () => {
    // Fetch navigation from sitemap API
    const { navigation, navStructure, links, templates, isLoading: isSitemapLoading, error: sitemapError, refetch } = useSitemap();

    const location = useLocation();
    const navigate = useNavigate();
    const pinned = useHeadroom({ fixedAt: 120 });
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

    // Track if this is the initial page load
    const isInitialLoad = useRef(true);

    // Redirect to dashboard on direct URL navigation (refresh, bookmark, direct entry)
    // This enforces pure HATEOAS navigation - users must start from dashboard and follow links
    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false;

            // If initial load and not on dashboard, help, or settings, redirect
            if (
                location.pathname !== '/dashboard' &&
                location.pathname !== '/' &&
                !location.pathname.startsWith('/help') &&
                location.pathname !== '/settings'
            ) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [location.pathname, navigate]);

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
                <Stack gap="md">
                    <Skeleton height={40} radius="md" />
                    <Skeleton height={40} radius="md" />
                    <Skeleton height={40} radius="md" />
                </Stack>
            );
        }

        if (sitemapError) {
            return (
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    title="Navigation Error"
                    color="yellow"
                    variant="light"
                    styles={{ root: { marginBottom: rem(16) } }}
                >
                    <Text size="sm" mb="xs">
                        Failed to load navigation menu.
                    </Text>
                    <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconRefresh size={14} />}
                        onClick={refetch}
                    >
                        Retry
                    </Button>
                </Alert>
            );
        }

        return (
            <>
                <LinksGroup
                    icon={IconHome}
                    label="Home"
                    link="/"
                />
                {mainNav.map((item) => <LinksGroup {...item} key={item.label} />)}
            </>
        );
    };

    return (
        <AppShell
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !mobileOpened, desktop: !desktopOpened } }}
            padding="0"
        >
            <AppShell.Navbar p="md" pt="0" pb="0">
                {/* Branding */}
                <AppShell.Section style={{ height: rem(60), display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--mantine-color-default-border)', marginLeft: 'calc(var(--mantine-spacing-md) * -1)', marginRight: 'calc(var(--mantine-spacing-md) * -1)', padding: '0 var(--mantine-spacing-md)' }}>
                    <Group gap="md">
                        <div
                            style={{
                                width: rem(32),
                                height: rem(32),
                                borderRadius: rem(8),
                                backgroundColor: 'var(--mantine-color-blue-light)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text fw={700} size="lg" c="blue">
                                SL
                            </Text>
                        </div>
                        <Stack gap={0}>
                            <Text fw={600} size="sm">
                                Serverless Launchpad
                            </Text>
                            <Text size="xs" c="dimmed">
                                Mantine Edition
                            </Text>
                        </Stack>
                    </Group>
                </AppShell.Section>

                <AppShell.Section grow component={ScrollArea} className={classes.links}>
                    <div className={classes.linksInner}>{renderNavigation()}</div>
                </AppShell.Section>
                <AppShell.Section>
                    <div className={classes.footer}>
                        <UserButton accountNav={accountNav} />
                    </div>
                </AppShell.Section>
            </AppShell.Navbar>
            <AppShell.Main>
                {/* Header - inside main content area, not spanning sidebar */}
                <Box
                    component="header"
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        height: rem(60),
                        borderBottom: '1px solid var(--mantine-color-default-border)',
                        backgroundColor: 'var(--mantine-color-body)',
                        transform: pinned ? 'translateY(0)' : 'translateY(-100%)',
                        transition: 'transform 200ms ease',
                    }}
                >
                    <Group h="100%" px="md" gap="md" wrap="nowrap">
                        {/* Mobile menu toggle */}
                        <ActionIcon onClick={toggleMobile} variant="subtle" size="lg" hiddenFrom="lg">
                            <IconMenu2 size={20} />
                        </ActionIcon>

                        {/* Desktop sidebar toggle */}
                        <ActionIcon onClick={toggleDesktop} variant="subtle" size="lg" visibleFrom="lg">
                            {desktopOpened ? <IconChevronLeft size={20} /> : <IconChevronRight size={20} />}
                        </ActionIcon>

                        {/* Breadcrumbs - flex-1 to fill remaining space */}
                        <Box style={{ flex: 1 }}>
                            <Breadcrumbs />
                        </Box>

                        {/* Right side action buttons */}
                        <Group gap="xs" wrap="nowrap">
                            {/* Search Icon (disabled) */}
                            <Box
                                component="span"
                                style={{
                                    width: rem(34),
                                    height: rem(34),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.4,
                                    cursor: 'not-allowed',
                                }}
                                aria-label="Search"
                                title="Search (coming soon)"
                            >
                                <IconSearch size={20} />
                            </Box>

                            {/* Help Button */}
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                onClick={() => navigate('/help')}
                                aria-label="Help"
                                title="Help Center"
                            >
                                <IconHelp size={20} />
                            </ActionIcon>
                        </Group>
                    </Group>
                </Box>

                {/* Main Content */}
                <Box p="md" style={{ backgroundColor: 'light-dark(rgba(241, 245, 249, 0.3), rgba(30, 41, 59, 0.3))', minHeight: 'calc(100vh - 60px)' }}>
                    {isSitemapLoading ? (
                        <Stack align="center" justify="center" style={{ minHeight: 400 }} gap="md">
                            <Skeleton height={50} circle />
                            <Skeleton height={20} width={250} />
                            <Skeleton height={20} width={200} />
                        </Stack>
                    ) : (
                        <Routes key={location.pathname}>
                            {/* Redirect root to dashboard */}
                            <Route index element={<DashboardHome />} />

                            {/* Dashboard home route */}
                            <Route path="dashboard" element={<DashboardHome />} />

                            {/* Settings route */}
                            <Route path="settings" element={<SettingsPage />} />

                            {/* Help Center routes */}
                            <Route path="help" element={<HelpPage />} />
                            <Route path="help/:topicId" element={<HelpTopicDetail />} />

                            {/* Dynamic routes from sitemap */}
                            {dynamicRoutes.map((route, index) => (
                                <Route key={route.path || index} path={route.path} element={route.element} />
                            ))}

                            {/* Catch-all for HAL resources (users, my-profile, etc.) */}
                            <Route path="*" element={<GenericResourceView />} />
                        </Routes>
                    )}
                </Box>
            </AppShell.Main>
        </AppShell>
    );
};
