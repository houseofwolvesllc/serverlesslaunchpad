/**
 * ESLint Configuration for web.svelte package
 * Inherits from root config and adds Svelte-specific settings.
 */

import { baseConfig, baseRules, configFileRules, ignores, globals, tseslint } from '../eslint.config.mjs';
import svelte from 'eslint-plugin-svelte';

export default tseslint.config(
    // Spread base config (ignores, recommended rules, prettier)
    ...baseConfig,

    // Additional ignores specific to Svelte
    {
        ignores: [
            ...ignores,
            '.svelte-kit/**',
            'package/**',
            '.env',
            '.env.*',
            '!.env.example',
            'pnpm-lock.yaml',
            'package-lock.json',
            'yarn.lock',
            // Files with advanced Svelte syntax that cause parsing issues
            '**/HalCollectionList.svelte',
            '**/HalResourceDetail.svelte',
        ],
    },

    // Svelte recommended
    ...svelte.configs['flat/recommended'],

    // TypeScript files
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                extraFileExtensions: ['.svelte'],
            },
        },
        rules: {
            ...baseRules,
            'no-undef': 'off', // TypeScript handles this
            'no-useless-escape': 'warn',
        },
    },

    // Svelte files
    {
        files: ['**/*.svelte'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            parser: svelte.parser,
            parserOptions: {
                parser: tseslint.parser,
            },
        },
        rules: {
            ...baseRules,
            'no-undef': 'off', // TypeScript handles this
            'no-useless-escape': 'warn',
            'svelte/no-at-html-tags': 'warn', // Allow @html with warning
        },
    },

    // Config files (tailwind, vite, etc.)
    {
        files: ['*.config.ts', '*.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            ...configFileRules,
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    }
);
