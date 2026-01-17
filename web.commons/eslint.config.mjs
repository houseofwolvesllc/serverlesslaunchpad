/**
 * ESLint Configuration for web.commons package
 * Inherits from root config. Shared utilities for web packages.
 */

import { baseConfig, baseRules, globals, tseslint } from '../eslint.config.mjs';

export default tseslint.config(
    // Spread base config (ignores, recommended rules, prettier)
    ...baseConfig,

    // Source files
    {
        files: ['src/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2020,
            },
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                sourceType: 'module',
                ecmaVersion: 2020,
            },
        },
        rules: {
            ...baseRules,
            '@typescript-eslint/explicit-function-return-type': 'warn',
        },
    }
);
