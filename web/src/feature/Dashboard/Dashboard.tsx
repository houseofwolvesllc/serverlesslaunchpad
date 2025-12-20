import { AppShell, Burger, Text } from '@mantine/core';
import { useDisclosure, useHeadroom } from '@mantine/hooks';
import { useAuth } from '../../feature/Authentication';
import { Logo } from './Logo';
import { Group, ScrollArea, rem, Button } from '@mantine/core';
import {
    IconNotes,
    IconCalendarStats,
    IconGauge,
    IconPresentationAnalytics,
    IconFileAnalytics,
    IconAdjustments,
    IconLock,
} from '@tabler/icons-react';
import { UserButton } from '../../components/UserButton/UserButton';
import { LinksGroup } from '../../components/NavbarLinksGroup/NavbarLinksGroup';
import classes from './Dashboard.module.css';
import { useEffect } from 'react';

const mockdata = [
    { label: 'Dashboard', icon: IconGauge },
    {
        label: 'Market news',
        icon: IconNotes,
        initiallyOpened: true,
        links: [
            { label: 'Overview', link: '/blah' },
            { label: 'Forecasts', link: '/' },
            { label: 'Outlook', link: '/' },
            { label: 'Real time', link: '/' },
        ],
    },
    {
        label: 'Releases',
        icon: IconCalendarStats,
        links: [
            { label: 'Upcoming releases', link: '/' },
            { label: 'Previous releases', link: '/' },
            { label: 'Releases schedule', link: '/' },
        ],
    },
    { label: 'Analytics', icon: IconPresentationAnalytics },
    { label: 'Contracts', icon: IconFileAnalytics },
    { label: 'Settings', icon: IconAdjustments },
    {
        label: 'Security',
        icon: IconLock,
        links: [
            { label: 'Enable 2FA', link: '/' },
            { label: 'Change password', link: '/' },
            { label: 'Recovery codes', link: '/' },
        ],
    },
];

export const Dashboard = () => {
    const auth = useAuth();
    const pinned = useHeadroom({ fixedAt: 120 });
    const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

    const lorem =
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Eos ullam, ex cum repellat alias ea nemo. Ducimus ex nesciunt hic ad saepe molestiae nobis necessitatibus laboriosam officia, reprehenderit, earum fugiat?';

    const links = mockdata.map((item) => <LinksGroup {...item} key={item.label} />);

    useEffect(() => {
        console.log('DASHBOARD USEEFFECT', auth.signedInUser);
    }, []);

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
                    <Logo style={{ width: rem(120) }} />
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="md" pt="0" pb="0">
                <AppShell.Section grow component={ScrollArea} className={classes.links}>
                    <div className={classes.linksInner}>{links}</div>
                </AppShell.Section>
                <AppShell.Section>
                    <div className={classes.footer}>
                        <UserButton />
                    </div>
                </AppShell.Section>
            </AppShell.Navbar>
            <AppShell.Main>
                Main
                <br />
                <div>Authenticated as {auth.signedInUser?.username}</div>
                <Button onClick={() => auth.signOut()}>Logout</Button>
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
