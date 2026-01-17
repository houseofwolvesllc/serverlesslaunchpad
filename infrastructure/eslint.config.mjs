/**
 * ESLint Configuration for infrastructure package
 * Inherits from root config. CDK infrastructure code.
 */

import { baseConfig, baseRules, nodeLanguageOptions, tseslint, ignores } from '../eslint.config.mjs';

export default tseslint.config(
    // Spread base config (ignores, recommended rules, prettier)
    ...baseConfig,

    // Additional ignores specific to this package
    {
        ignores: [...ignores, 'cdk.out/**', 'assets/**'],
    },

    // Source files (CDK uses bin/, lib/, config/, deployment/)
    {
        files: ['bin/**/*.ts', 'lib/**/*.ts', 'config/**/*.ts', 'deployment/**/*.ts'],
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
