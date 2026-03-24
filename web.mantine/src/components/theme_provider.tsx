/**
 * Theme Provider
 *
 * Provides theme context and persistence for light, dark, auto, and color theme modes.
 * Auto mode resolves to light (6AM-5:59PM) or dark (6PM-5:59AM), re-evaluated every 15 minutes.
 * Color themes (midnight, emerald, sunset, charcoal) set Mantine's color scheme to dark and
 * apply a CSS class for color variable overrides.
 *
 * Uses localStorage to persist user preference across sessions.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';

export type Theme = 'dark' | 'light' | 'auto' | 'midnight' | 'emerald' | 'sunset' | 'charcoal';

/** Color themes are dark variants that need both the dark scheme and their named class */
const COLOR_THEMES: Theme[] = ['midnight', 'emerald', 'sunset', 'charcoal'];

const STORAGE_KEY = 'ui-theme';

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: 'auto',
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * Determine if the current time falls within daytime hours (6AM-5:59PM)
 */
function isDaytime(): boolean {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
}

/**
 * Resolve the effective Mantine color scheme for a given theme
 */
function resolveColorScheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'light') return 'light';
    if (theme === 'dark') return 'dark';
    if (theme === 'auto') return isDaytime() ? 'light' : 'dark';
    // All color themes are dark variants
    return 'dark';
}

/**
 * Apply or remove color theme CSS classes on the document root.
 * Only color themes get a class; light/dark/auto rely on Mantine's scheme.
 */
function applyColorThemeClass(theme: Theme): void {
    const root = window.document.documentElement;
    // Remove any previously applied color theme class
    root.classList.remove(...COLOR_THEMES);

    if (COLOR_THEMES.includes(theme)) {
        root.classList.add(theme);
    }
}

interface ThemeProviderProps {
    children: React.ReactNode;
}

/**
 * Inner provider that consumes Mantine's color scheme hook.
 * Must be rendered inside MantineProvider.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
    const { setColorScheme } = useMantineColorScheme();

    const [theme, setThemeState] = useState<Theme>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && isValidTheme(stored)) return stored;
        return 'auto';
    });

    // Synchronize Mantine color scheme and CSS class whenever theme changes
    useEffect(() => {
        setColorScheme(resolveColorScheme(theme));
        applyColorThemeClass(theme);

        // For auto mode, re-evaluate every 15 minutes
        if (theme === 'auto') {
            const interval = setInterval(() => {
                setColorScheme(resolveColorScheme(theme));
            }, 15 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [theme, setColorScheme]);

    const setTheme = (next: Theme) => {
        localStorage.setItem(STORAGE_KEY, next);
        setThemeState(next);
    };

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeProviderContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

function isValidTheme(value: string): value is Theme {
    return ['dark', 'light', 'auto', 'midnight', 'emerald', 'sunset', 'charcoal'].includes(value);
}
