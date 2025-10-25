import { AppShell, Burger, Text, Image, Skeleton, Alert, Stack } from '@mantine/core';
import { useDisclosure, useHeadroom } from '@mantine/hooks';
import { AuthenticationContext, useAuth } from '../authentication';
import { Group, ScrollArea, rem, Button } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { UserButton } from '../../components/user_button/user_button';
import { LinksGroup } from '../../components/navbar_links_group/navbar_links_group';
import classes from './dashboard.module.css';
import { useContext } from 'react';
import { LoadingContext } from '../../context/loading_context';
import { useNavigate } from 'react-router-dom';
import { useSitemap } from '../sitemap/hooks/use_sitemap';

export const Dashboard = () => {
    const auth = useAuth();
    const { setIsLoading } = useContext(LoadingContext);
    const { signedInUser } = useContext(AuthenticationContext);
    const navigate = useNavigate();

    // Fetch navigation from sitemap API
    const { navigation, isLoading: isSitemapLoading, error: sitemapError, refetch } = useSitemap();

    const pinned = useHeadroom({ fixedAt: 120 });
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

    const lorem =
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Eos ullam, ex cum repellat alias ea nemo. Ducimus ex nesciunt hic ad saepe molestiae nobis necessitatibus laboriosam officia, reprehenderit, earum fugiat?';

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

        return mainNav.map((item) => <LinksGroup {...item} key={item.label} />);
    };

    const onSignOut = async () => {
        console.log('DASHBOARD SIGN OUT');
        setIsLoading(true);
        await auth.signOut();
        setIsLoading(false);
        navigate('/auth/signin');
    };

    return (
        <AppShell
            header={{ height: 60, collapsed: !pinned }}
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !mobileOpened, desktop: !desktopOpened } }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
                    <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
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
                Main
                <br />
                <div>Authenticated as {signedInUser?.username}</div>
                <Button onClick={onSignOut}>Logout</Button>
                {Array(40)
                    .fill(0)
                    .map((_, index) => (
                        <Text size="lg" key={index} my="md" maw={600} mx="auto">
                            {lorem}
                        </Text>
                    ))}
            </AppShell.Main>
        </AppShell>
    );
};
