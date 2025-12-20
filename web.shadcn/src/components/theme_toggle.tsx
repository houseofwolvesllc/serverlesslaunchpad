/**
 * Theme Toggle Component
 *
 * Button that toggles between light and dark modes.
 * Displays sun icon in light mode, moon icon in dark mode.
 */

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from './theme_provider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const toggle_theme = () => {
        // Toggle between light and dark (ignore system for simplicity)
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggle_theme}
            aria-label="Toggle theme"
        >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
