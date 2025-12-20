import { ActionIcon, Alert, AppShell, Box, Button, Group, Image, ScrollArea, Skeleton, Stack, Text, rem } from '@mantine/core';
import { useDisclosure, useHeadroom } from '@mantine/hooks';
import { IconAlertCircle, IconChevronRight, IconMenu2, IconRefresh, IconApi } from '@tabler/icons-react';
import { Route, Routes } from 'react-router-dom';
import { useMemo, useEffect, useState } from 'react';
import { LinksGroup } from '../../components/navbar_links_group/navbar_links_group';
import { UserButton } from '../../components/user_button/user_button';
import { useSitemap } from '../sitemap/hooks/use_sitemap';
import { generateRoutesFromSitemap } from '../../routing/route_generator';
import { NoMatch } from '../../components/no_match';
import { DashboardHome } from './dashboard_home';
import WebConfigurationStore from '../../configuration/web_config_store';
import classes from './dashboard.module.css';

export const Dashboard = () => {
    // Fetch navigation from sitemap API
    const { navigation, rawItems, isLoading: isSitemapLoading, error: sitemapError, refetch } = useSitemap();

    const pinned = useHeadroom({ fixedAt: 120 });
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
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

    // Split navigation into main nav (home, documentation, admin) and account nav
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
                {mainNav.map((item) => <LinksGroup {...item} key={item.label} />)}
                {apiBaseUrl && (
                    <LinksGroup
                        icon={IconApi}
                        label="Hypermedia API Documentation"
                        link={apiBaseUrl}
                        newTab={true}
                    />
                )}
            </>
        );
    };

    return (
        <AppShell
            header={{ height: 60, collapsed: !pinned }}
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !mobileOpened, desktop: !desktopOpened } }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <ActionIcon onClick={toggleMobile} variant="subtle" size="lg" hiddenFrom="sm">
                        <Box
                            style={{
                                transform: mobileOpened ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 250ms ease',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            {mobileOpened ? <IconChevronRight size={20} /> : <IconMenu2 size={20} />}
                        </Box>
                    </ActionIcon>
                    <ActionIcon onClick={toggleDesktop} variant="subtle" size="lg" visibleFrom="sm">
                        <Box
                            style={{
                                transform: desktopOpened ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 250ms ease',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            {desktopOpened ? <IconChevronRight size={20} /> : <IconMenu2 size={20} />}
                        </Box>
                    </ActionIcon>
                    <Image
                        src="/svg/serverless_launchpad_logo.svg"
                        alt="Serverless Launchpad Logo"
                        style={{ height: rem(56) }}
                    />
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="md" pt="0" pb="0">
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
                {/* Render dynamic routes from sitemap */}
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
            </AppShell.Main>
        </AppShell>
    );
};
