/**
 * Theme Toggle Component
 *
 * Button that toggles between light and dark modes using Mantine's color scheme.
 * Displays sun icon in light mode, moon icon in dark mode.
 */

import { ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

export function ThemeToggle() {
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

    const toggleColorScheme = () => {
        setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <ActionIcon
            onClick={toggleColorScheme}
            variant="subtle"
            size="lg"
            aria-label="Toggle color scheme"
        >
            {computedColorScheme === 'dark' ? (
                <IconSun size={20} />
            ) : (
                <IconMoon size={20} />
            )}
        </ActionIcon>
    );
}
