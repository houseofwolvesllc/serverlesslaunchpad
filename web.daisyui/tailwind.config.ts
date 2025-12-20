import type { Config } from 'tailwindcss';

export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
        },
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: [
            {
                light: {
                    ...require('daisyui/src/theming/themes')['light'],
                    // Primary color (vibrant blue)
                    primary: 'hsl(221.2, 83.2%, 53.3%)',
                    'primary-content': 'hsl(210, 40%, 98%)',
                    // Secondary color (light gray)
                    secondary: 'hsl(210, 40%, 96.1%)',
                    'secondary-content': 'hsl(222.2, 47.4%, 11.2%)',
                    // Accent color
                    accent: 'hsl(210, 40%, 96.1%)',
                    'accent-content': 'hsl(222.2, 47.4%, 11.2%)',
                    // Neutral/muted colors
                    neutral: 'hsl(222.2, 84%, 4.9%)',
                    'neutral-content': 'hsl(210, 40%, 98%)',
                    // Base colors (backgrounds)
                    'base-100': 'hsl(0, 0%, 100%)',
                    'base-200': 'hsl(210, 40%, 96.1%)',
                    'base-300': 'hsl(214.3, 31.8%, 91.4%)',
                    'base-content': 'hsl(222.2, 84%, 4.9%)',
                    // State colors
                    info: 'hsl(221.2, 83.2%, 53.3%)',
                    success: 'hsl(142.1, 76.2%, 36.3%)',
                    warning: 'hsl(38, 92%, 50%)',
                    error: 'hsl(0, 84.2%, 60.2%)',
                },
                dark: {
                    ...require('daisyui/src/theming/themes')['dark'],
                    // Primary color (darker vibrant blue)
                    primary: 'hsl(217.2, 91.2%, 59.8%)',
                    'primary-content': 'hsl(222.2, 47.4%, 11.2%)',
                    // Secondary color (dark gray)
                    secondary: 'hsl(217.2, 32.6%, 17.5%)',
                    'secondary-content': 'hsl(210, 40%, 98%)',
                    // Accent color
                    accent: 'hsl(217.2, 32.6%, 17.5%)',
                    'accent-content': 'hsl(210, 40%, 98%)',
                    // Neutral colors
                    neutral: 'hsl(222.2, 84%, 4.9%)',
                    'neutral-content': 'hsl(210, 40%, 98%)',
                    // Base colors (dark backgrounds)
                    'base-100': 'hsl(222.2, 84%, 4.9%)',
                    'base-200': 'hsl(217.2, 32.6%, 17.5%)',
                    'base-300': 'hsl(217.2, 32.6%, 17.5%)',
                    'base-content': 'hsl(210, 40%, 98%)',
                    // State colors
                    info: 'hsl(217.2, 91.2%, 59.8%)',
                    success: 'hsl(142.1, 76.2%, 36.3%)',
                    warning: 'hsl(38, 92%, 50%)',
                    error: 'hsl(0, 62.8%, 30.6%)',
                },
            },
        ],
        darkTheme: 'dark',
        base: true,
        styled: true,
        utils: true,
    },
} satisfies Config;
