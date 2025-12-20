/**
 * Theme Toggle Component
 *
 * Button that toggles between light and dark modes.
 * Displays sun icon in light mode, moon icon in dark mode.
 */

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme_provider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        // Toggle between light and dark (ignore system for simplicity)
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-square"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </button>
    );
}
