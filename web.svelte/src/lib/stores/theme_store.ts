/**
 * Theme Store
 *
 * Provides reactive theme state and persistence for light, dark, auto, and color theme modes.
 * Auto mode resolves to light (6AM-5:59PM) or dark (6PM-5:59AM), re-evaluated every 15 minutes.
 * Color themes (midnight, emerald, sunset, charcoal) apply both their named class and the
 * dark class to document.documentElement so that existing dark: Tailwind utilities continue working.
 *
 * Uses localStorage to persist user preference across sessions.
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'dark' | 'light' | 'auto' | 'midnight' | 'emerald' | 'sunset' | 'charcoal';

const STORAGE_KEY = 'ui-theme';
const DEFAULT_THEME: Theme = 'auto';

/** Color themes are dark variants that need both the dark class and their named class */
const COLOR_THEMES: Theme[] = ['midnight', 'emerald', 'sunset', 'charcoal'];

/** All theme classes that may be applied to document.documentElement */
const ALL_THEME_CLASSES = ['light', 'dark', ...COLOR_THEMES] as const;

/** Re-evaluation interval for auto mode (15 minutes) */
const AUTO_INTERVAL_MS = 15 * 60 * 1000;

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
	if (!browser) return;

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

function createThemeStore() {
	const initialTheme: Theme = browser
		? (localStorage.getItem(STORAGE_KEY) as Theme) || DEFAULT_THEME
		: DEFAULT_THEME;

	const { subscribe, set } = writable<Theme>(initialTheme);

	let autoInterval: ReturnType<typeof setInterval> | null = null;

	function clearAutoInterval() {
		if (autoInterval !== null) {
			clearInterval(autoInterval);
			autoInterval = null;
		}
	}

	function setupAutoInterval() {
		clearAutoInterval();
		autoInterval = setInterval(() => {
			applyThemeClasses('auto');
		}, AUTO_INTERVAL_MS);
	}

	// Apply theme on initial load
	if (browser) {
		applyThemeClasses(initialTheme);
		if (initialTheme === 'auto') {
			setupAutoInterval();
		}
	}

	return {
		subscribe,
		setTheme: (theme: Theme) => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, theme);
			}
			applyThemeClasses(theme);
			clearAutoInterval();
			if (theme === 'auto') {
				setupAutoInterval();
			}
			set(theme);
		},
	};
}

export const themeStore = createThemeStore();
