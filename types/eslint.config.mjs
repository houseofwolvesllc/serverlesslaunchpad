/**
 * ESLint Configuration for types package
 * Inherits from root config. No test files in this package.
 */

import { baseConfig, baseRules, nodeLanguageOptions, tseslint } from '../eslint.config.mjs';

export default tseslint.config(
    // Spread base config (ignores, recommended rules, prettier)
    ...baseConfig,

    // Source and test files
    {
        files: ['src/**/*.ts', 'test/**/*.ts'],
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
    }
);
