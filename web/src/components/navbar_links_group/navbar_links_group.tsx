import { useState } from 'react';
import { Group, Box, Collapse, ThemeIcon, Text, UnstyledButton, rem } from '@mantine/core';
import { IconCalendarStats, IconChevronRight } from '@tabler/icons-react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import classes from './navbar_links_group.module.css';
import { logger } from '../../logging/logger';

interface LinksGroupProps {
    icon: React.FC<any>;
    label: string;
    initiallyOpened?: boolean;
    link?: string;
    newTab?: boolean;
    links?: { label: string; link?: string; onClick?: (navigate: NavigateFunction) => Promise<void> }[];
}

export function LinksGroup({ icon: Icon, label, initiallyOpened, link, newTab, links }: LinksGroupProps) {
    const hasLinks = Array.isArray(links);
    const [opened, setOpened] = useState(initiallyOpened || false);
    const navigate = useNavigate();

    const items = (hasLinks ? links : []).map((link) => (
        <Text<'a'>
            component="a"
            className={classes.link}
            href={link.link}
            key={link.label}
            onClick={async (event) => {
                event.preventDefault();

                try {
                    // If there's a custom onClick handler (e.g., for POST actions), use it
                    if (link.onClick) {
                        await link.onClick(navigate);
                    }
                    // Otherwise, use React Router to navigate (for GET links)
                    else if (link.link) {
                        navigate(link.link);
                    }
                } catch (error) {
                    // Error already handled by action handler with notifications
                    // This catch is just for safety to prevent unhandled promise rejections
                    logger.error('Navigation error', { error });
                }
            }}
        >
            {link.label}
        </Text>
    ));

    const handleParentClick = () => {
        // If has children, toggle collapse
        if (hasLinks) {
            setOpened((o) => !o);
        }
        // If has a link but no children, navigate
        else if (link) {
            if (newTab) {
                window.open(link, '_blank', 'noopener,noreferrer');
            } else {
                navigate(link);
            }
        }
    };

    return (
        <>
            <UnstyledButton onClick={handleParentClick} className={classes.control}>
                <Group justify="space-between" gap={0}>
                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                        <ThemeIcon variant="light" size={30}>
                            <Icon style={{ width: rem(18), height: rem(18) }} />
                        </ThemeIcon>
                        <Box ml="md">{label}</Box>
                    </Box>
                    {hasLinks && (
                        <IconChevronRight
                            className={classes.chevron}
                            stroke={1.5}
                            style={{
                                width: rem(16),
                                height: rem(16),
                                transform: opened ? 'rotate(-90deg)' : 'none',
                            }}
                        />
                    )}
                </Group>
            </UnstyledButton>
            {hasLinks ? <Collapse in={opened}>{items}</Collapse> : null}
        </>
    );
}

const mockdata = {
    label: 'Releases',
    icon: IconCalendarStats,
    links: [
        { label: 'Upcoming releases', link: '/' },
        { label: 'Previous releases', link: '/' },
        { label: 'Releases schedule', link: '/' },
    ],
};

export function NavbarLinksGroup() {
    return (
        <Box mih={220} p="md">
            <LinksGroup {...mockdata} />
        </Box>
    );
}
