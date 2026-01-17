/**
 * ESLint Configuration for api.hypermedia package
 * Inherits from root config and adds Node.js/backend-specific settings.
 */

import { baseConfig, baseRules, nodeLanguageOptions, testRules, tseslint, ignores } from '../eslint.config.mjs';
import vitest from 'eslint-plugin-vitest';

export default tseslint.config(
    // Spread base config (ignores, recommended rules, prettier)
    ...baseConfig,

    // Additional ignores specific to this package
    {
        ignores: [...ignores, 'config/**'],
    },

    // Source files
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            ...nodeLanguageOptions,
            parserOptions: {
                ...nodeLanguageOptions.parserOptions,
                project: './tsconfig.json',
            },
        },
        rules: {
            ...baseRules,
            '@typescript-eslint/explicit-function-return-type': 'warn',
        },
    },

    // Test files (no project for type-aware rules to avoid tsconfig issues)
    {
        files: ['test/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
        languageOptions: nodeLanguageOptions,
        plugins: { vitest },
        rules: {
            ...vitest.configs.recommended.rules,
            ...testRules,
            '@typescript-eslint/explicit-function-return-type': 'off',
            'vitest/valid-expect': 'warn',
            'no-regex-spaces': 'warn',
        },
    }
);
