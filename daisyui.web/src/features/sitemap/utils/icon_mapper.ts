/**
 * Icon Mapper Utility
 *
 * Maps string-based icon names from the API to Lucide React components.
 * Provides a default icon for unmapped values to ensure graceful degradation.
 *
 * @see https://lucide.dev/ for available icons
 */

import {
    ShieldCheck,
    Code2,
    Calendar,
    BarChart,
    Circle,
    Clock,
    LayoutDashboard,
    FileText,
    Gauge,
    Home,
    Key,
    Lock,
    LogIn,
    LogOut,
    Settings,
    Shield,
    UserCircle,
    Users,
    type LucideIcon,
} from 'lucide-react';

/**
 * Mapping of API icon strings to Lucide Icon components
 */
export const iconMapper: Record<string, LucideIcon> = {
    // Authentication & Security
    lock: Lock,
    '2fa': ShieldCheck,
    key: Key,
    shield: Shield,
    login: LogIn,
    logout: LogOut,

    // User Management
    users: Users,
    user: UserCircle,
    sessions: UserCircle,
    'user-circle': UserCircle,

    // Admin & Settings
    settings: Settings,
    cog: Settings,
    admin: Shield,
    'admin-reports': BarChart,
    'admin-settings': Settings,

    // Navigation
    home: Home,
    dashboard: LayoutDashboard,
    gauge: Gauge,
    api: Code2,

    // Data & Analytics
    chart: BarChart,
    'chart-bar': BarChart,
    analytics: BarChart,

    // Content
    file: FileText,
    'file-text': FileText,
    calendar: Calendar,
    'calendar-stats': Calendar,

    // Time & Sessions
    clock: Clock,
    time: Clock,

    // API Keys
    'api-keys': Key,

    // Default/Unknown
    default: Circle,
    circle: Circle,
};

/**
 * Get an icon component for a given icon name
 *
 * @param iconName - The icon name from the API (e.g., "lock", "users")
 * @returns The corresponding Lucide Icon component, or the default icon if not found
 *
 * @example
 * ```typescript
 * const Icon = getIcon('lock'); // Returns Lock
 * const DefaultIcon = getIcon('unknown'); // Returns Circle (default)
 * ```
 */
export function getIcon(iconName?: string): LucideIcon {
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
