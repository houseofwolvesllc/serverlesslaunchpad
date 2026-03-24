/**
 * Theme Provider
 *
 * Provides theme context and persistence for light, dark, auto, and color theme modes.
 * Auto mode resolves to light (6AM-5:59PM) or dark (6PM-5:59AM), re-evaluated every 15 minutes.
 * Color themes (midnight, emerald, sunset, charcoal) apply both their named class and the
 * dark class to document.documentElement so that existing dark: Tailwind utilities continue working.
 *
 * Uses localStorage to persist user preference across sessions.
 */

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'auto' | 'midnight' | 'emerald' | 'sunset' | 'charcoal';

/** Color themes are dark variants that need both the dark class and their named class */
const COLOR_THEMES: Theme[] = ['midnight', 'emerald', 'sunset', 'charcoal'];

/** All theme classes that may be applied to document.documentElement */
const ALL_THEME_CLASSES = ['light', 'dark', ...COLOR_THEMES] as const;

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
 * Apply the correct classes to document.documentElement for the given theme
 */
function applyThemeClasses(theme: Theme): void {
    const root = window.document.documentElement;

    root.classList.remove(...ALL_THEME_CLASSES);

    if (theme === 'auto') {
        root.classList.add(isDaytime() ? 'light' : 'dark');
        return;
    }

    if (COLOR_THEMES.includes(theme)) {
        // Color themes are dark variants — add both dark (for Tailwind dark: utilities)
        // and the named class (for CSS variable overrides)
        root.classList.add('dark', theme);
        return;
    }

    root.classList.add(theme);
}

export function ThemeProvider({
    children,
    defaultTheme = 'auto',
    storageKey = 'ui-theme',
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    );

    useEffect(() => {
        applyThemeClasses(theme);

        // For auto mode, re-evaluate every 15 minutes
        if (theme === 'auto') {
            const interval = setInterval(() => {
                applyThemeClasses(theme);
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
        <ThemeProviderContext.Provider {...props} value={value}>
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
