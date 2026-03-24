/**
 * Theme Provider
 *
 * Provides theme context and persistence for light, dark, auto, and color theme modes.
 * Auto mode resolves to light (6AM-5:59PM) or dark (6PM-5:59AM), re-evaluated every 15 minutes.
 * Color themes (midnight, emerald, sunset, charcoal) are registered as DaisyUI themes and applied
 * via the data-theme attribute on document.documentElement.
 *
 * Uses localStorage to persist user preference across sessions.
 */

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'auto' | 'midnight' | 'emerald' | 'sunset' | 'charcoal';

/** Color themes are dark variants registered as custom DaisyUI themes */
const COLOR_THEMES: Theme[] = ['midnight', 'emerald', 'sunset', 'charcoal'];

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

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
 * Apply the correct data-theme attribute to document.documentElement for the given theme.
 * DaisyUI reads data-theme to resolve its design tokens.
 */
function applyTheme(theme: Theme): void {
    const root = window.document.documentElement;

    if (theme === 'auto') {
        const resolved = isDaytime() ? 'light' : 'dark';
        root.setAttribute('data-theme', resolved);
        root.classList.remove('light', 'dark');
        root.classList.add(resolved);
        return;
    }

    // For color themes, also set dark class so Tailwind dark: utilities work
    root.setAttribute('data-theme', theme);
    root.classList.remove('light', 'dark');

    if (COLOR_THEMES.includes(theme)) {
        root.classList.add('dark');
    } else {
        root.classList.add(theme);
    }
}

export function ThemeProvider({
    children,
    defaultTheme = 'auto',
    storageKey = 'ui-theme',
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    );

    useEffect(() => {
        applyTheme(theme);

        // For auto mode, re-evaluate every 15 minutes
        if (theme === 'auto') {
            const interval = setInterval(() => {
                applyTheme(theme);
            }, 15 * 60 * 1000);

            return () => clearInterval(interval);
        }
    }, [theme]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme);
            setTheme(theme);
        },
    };

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');

    return context;
};
