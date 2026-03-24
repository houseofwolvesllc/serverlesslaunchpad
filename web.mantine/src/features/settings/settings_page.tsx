/**
 * Settings Page
 *
 * User-facing settings with theme/appearance controls.
 * Radio buttons for each theme option with label and description.
 * Core modes (Light, Dark, Auto) are separated from Color Themes by a divider.
 */

import { Card, Divider, Radio, Stack, Text, Title } from '@mantine/core';
import { useTheme, type Theme } from '../../components/theme_provider';

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
        <Card
            withBorder
            padding="md"
            radius="md"
            onClick={() => onSelect(option.value)}
            style={{
                cursor: 'pointer',
                borderColor: selected ? 'var(--mantine-primary-color-filled)' : undefined,
                backgroundColor: selected ? 'var(--mantine-primary-color-light)' : undefined,
            }}
        >
            <Radio
                value={option.value}
                checked={selected}
                onChange={() => onSelect(option.value)}
                label={
                    <Text component="span" size="sm" fw={500}>
                        {option.label}
                        {isRecommended && (
                            <Text component="span" size="xs" c="dimmed" ml="xs" fw={400}>
                                (Recommended)
                            </Text>
                        )}
                    </Text>
                }
                description={option.description}
                styles={{ radio: { cursor: 'pointer' }, label: { cursor: 'pointer' } }}
            />
        </Card>
    );
}

export function SettingsPage() {
    const { theme, setTheme } = useTheme();

    return (
        <Stack gap="lg">
            {/* Page Header */}
            <Stack gap={4}>
                <Title order={2}>Settings</Title>
                <Text c="dimmed">Manage your application preferences</Text>
            </Stack>

            {/* Appearance Section */}
            <Card withBorder padding="lg" radius="md">
                <Stack gap="md">
                    <Stack gap={4}>
                        <Text fw={600} size="lg">Appearance</Text>
                        <Text size="sm" c="dimmed">
                            Customize the look and feel of the application
                        </Text>
                    </Stack>

                    {/* Core Modes */}
                    <Stack gap="sm">
                        {CORE_MODES.map((option) => (
                            <ThemeRadioItem
                                key={option.value}
                                option={option}
                                selected={theme === option.value}
                                onSelect={setTheme}
                            />
                        ))}
                    </Stack>

                    {/* Divider */}
                    <Divider
                        label={
                            <Text size="xs" c="dimmed" tt="uppercase" fw={500} style={{ letterSpacing: '0.05em' }}>
                                Color Themes
                            </Text>
                        }
                        labelPosition="center"
                    />

                    {/* Color Themes */}
                    <Stack gap="sm">
                        {COLOR_THEMES.map((option) => (
                            <ThemeRadioItem
                                key={option.value}
                                option={option}
                                selected={theme === option.value}
                                onSelect={setTheme}
                            />
                        ))}
                    </Stack>
                </Stack>
            </Card>
        </Stack>
    );
}
