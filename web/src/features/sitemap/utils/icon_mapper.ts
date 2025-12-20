/**
 * Icon Mapper Utility
 *
 * Maps string-based icon names from the API to Tabler Icons React components.
 * Provides a default icon for unmapped values to ensure graceful degradation.
 *
 * @see https://tabler-icons.io/ for available icons
 */

import {
    IconLock,
    IconUsers,
    IconShield,
    IconChartBar,
    IconSettings,
    IconGauge,
    IconCalendarStats,
    IconHome,
    IconFileText,
    IconCircle,
    IconKey,
    IconClock,
    Icon2fa,
    IconUserCircle,
    IconLogout,
    IconLogin,
    IconDashboard,
    type Icon,
} from '@tabler/icons-react';

/**
 * Mapping of API icon strings to Tabler Icon components
 */
export const iconMapper: Record<string, Icon> = {
    // Authentication & Security
    lock: IconLock,
    '2fa': Icon2fa,
    key: IconKey,
    shield: IconShield,
    login: IconLogin,
    logout: IconLogout,

    // User Management
    users: IconUsers,
    user: IconUserCircle,
    'user-circle': IconUserCircle,

    // Admin & Settings
    settings: IconSettings,
    cog: IconSettings,
    admin: IconShield,
    'admin-reports': IconChartBar,
    'admin-settings': IconSettings,

    // Navigation
    home: IconHome,
    dashboard: IconDashboard,
    gauge: IconGauge,

    // Data & Analytics
    chart: IconChartBar,
    'chart-bar': IconChartBar,
    analytics: IconChartBar,

    // Content
    file: IconFileText,
    'file-text': IconFileText,
    calendar: IconCalendarStats,
    'calendar-stats': IconCalendarStats,

    // Time & Sessions
    clock: IconClock,
    time: IconClock,
    sessions: IconClock,

    // API Keys
    'api-keys': IconKey,

    // Default/Unknown
    default: IconCircle,
    circle: IconCircle,
};

/**
 * Get an icon component for a given icon name
 *
 * @param iconName - The icon name from the API (e.g., "lock", "users")
 * @returns The corresponding Tabler Icon component, or the default icon if not found
 *
 * @example
 * ```typescript
 * const Icon = getIcon('lock'); // Returns IconLock
 * const DefaultIcon = getIcon('unknown'); // Returns IconCircle (default)
 * ```
 */
export function getIcon(iconName?: string): Icon {
    if (!iconName) {
        return iconMapper.default;
    }

    // Normalize icon name: lowercase and trim
    const normalizedName = iconName.toLowerCase().trim();

    return iconMapper[normalizedName] || iconMapper.default;
}

/**
 * Check if an icon mapping exists for the given name
 *
 * @param iconName - The icon name to check
 * @returns True if the icon has a mapping, false otherwise
 *
 * @example
 * ```typescript
 * hasIcon('lock'); // true
 * hasIcon('unknown'); // false
 * ```
 */
export function hasIcon(iconName?: string): boolean {
    if (!iconName) {
        return false;
    }

    const normalizedName = iconName.toLowerCase().trim();
    return normalizedName in iconMapper && normalizedName !== 'default';
}

/**
 * Get all available icon names
 *
 * @returns Array of all mapped icon names
 */
export function getAvailableIconNames(): string[] {
    return Object.keys(iconMapper).filter((name) => name !== 'default');
}
