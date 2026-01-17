/**
 * ESLint Configuration for web.commons.react package
 * Inherits from root config. Shared React utilities for web packages.
 */

import { baseConfig, baseRules, browserLanguageOptions, tseslint } from '../eslint.config.mjs';
import reactHooks from 'eslint-plugin-react-hooks';

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
                project: './tsconfig.json',
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            ...baseRules,
            '@typescript-eslint/explicit-function-return-type': 'warn',
        },
    }
);
