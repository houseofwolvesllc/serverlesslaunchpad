import type { Config } from 'tailwindcss';

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {},
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: [
            {
                light: {
                    ...require('daisyui/src/theming/themes')['light'],
                    primary: '#3b82f6',
                    'primary-content': '#ffffff',
                },
                dark: {
                    ...require('daisyui/src/theming/themes')['dark'],
                    primary: '#3b82f6',
                    'primary-content': '#ffffff',
                },
            },
        ],
        darkTheme: 'dark',
        base: true,
        styled: true,
        utils: true,
    },
} satisfies Config;
