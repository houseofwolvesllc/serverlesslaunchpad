/**
 * Settings Page
 *
 * User-facing settings with theme/appearance controls.
 * Radio buttons for each theme option with label and description.
 * Core modes (Light, Dark, Auto) are separated from Color Themes by a divider.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTheme, type Theme } from '@/components/theme_provider';
import { cn } from '@/lib/utils';

interface ThemeOption {
    value: Theme;
    label: string;
    description: string;
}

const CORE_MODES: ThemeOption[] = [
    { value: 'light', label: 'Light', description: 'Clean, bright interface' },
    { value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
    { value: 'auto', label: 'Auto', description: 'Adjusts based on time of day' },
];

const COLOR_THEMES: ThemeOption[] = [
    { value: 'midnight', label: 'Midnight', description: 'Deep indigo with violet accents' },
    { value: 'emerald', label: 'Emerald', description: 'Forest green with mint accents' },
    { value: 'sunset', label: 'Sunset', description: 'Warm brown with amber accents' },
    { value: 'charcoal', label: 'Charcoal', description: 'True neutral gray, no color tint' },
];

function ThemeRadioItem({ option, selected, onSelect }: {
    option: ThemeOption;
    selected: boolean;
    onSelect: (value: Theme) => void;
}) {
    const isRecommended = option.value === 'auto';

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option.value)}
            className={cn(
                'flex items-start gap-3 w-full rounded-lg border p-4 text-left transition-colors',
                selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-accent/50'
            )}
        >
            <div className="mt-0.5">
                <div
                    className={cn(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                        selected ? 'border-primary' : 'border-muted-foreground/40'
                    )}
                >
                    {selected && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                </div>
            </div>
            <div className="flex-1 space-y-1">
                <Label className="text-sm font-medium cursor-pointer">
                    {option.label}
                    {isRecommended && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">(Recommended)</span>
                    )}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
            </div>
        </button>
    );
}

export const SettingsPage = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your application preferences
                </p>
            </div>

            {/* Appearance Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                        Customize the look and feel of the application
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div role="radiogroup" aria-label="Theme selection" className="space-y-6">
                        {/* Core Modes */}
                        <div className="space-y-3">
                            {CORE_MODES.map((option) => (
                                <ThemeRadioItem
                                    key={option.value}
                                    option={option}
                                    selected={theme === option.value}
                                    onSelect={setTheme}
                                />
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Color Themes</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Color Themes */}
                        <div className="space-y-3">
                            {COLOR_THEMES.map((option) => (
                                <ThemeRadioItem
                                    key={option.value}
                                    option={option}
                                    selected={theme === option.value}
                                    onSelect={setTheme}
                                />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
