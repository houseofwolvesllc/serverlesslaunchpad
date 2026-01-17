/**
 * ESLint Configuration for web.daisyui package
 * Inherits from root config and adds React-specific settings.
 */

import { baseConfig, browserLanguageOptions, reactRules, testRules, configFileRules, globals, tseslint } from '../eslint.config.mjs';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
    // Spread base config (ignores, recommended rules, prettier)
    ...baseConfig,

    // React/TypeScript source files
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            ...browserLanguageOptions,
            parserOptions: {
                ...browserLanguageOptions.parserOptions,
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            ...reactRules,
        },
    },

    // Test files
    {
        files: ['test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: testRules,
    },

    // Config files (postcss, tailwind, vite, etc.)
    {
        files: ['*.config.{ts,js,cjs,mjs}', 'postcss.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                module: 'readonly',
            },
        },
        rules: configFileRules,
    }
);
