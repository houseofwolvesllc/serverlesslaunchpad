/**
 * Root ESLint Configuration
 *
 * This file provides shared ESLint configurations for all packages in the monorepo.
 * Individual packages import and extend these configurations as needed.
 *
 * Usage in package configs:
 *   import { baseConfig, baseRules, nodeLanguageOptions, tseslint } from '../eslint.config.mjs';
 *
 *   export default tseslint.config(
 *     ...baseConfig,
 *     { files: ['src/**'], rules: { ...baseRules } }
 *   );
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// =============================================================================
// Common Ignores
// =============================================================================

/**
 * Common ignore patterns for all packages.
 * Individual packages can extend this with package-specific ignores.
 */
export const ignores = [
    'dist/**',
    'build/**',
    'coverage/**',
    'node_modules/**',
    '.vite/**',
    '**/*.d.ts',
];

// =============================================================================
// Base Rules
// =============================================================================

/**
 * Base rules for backwards compatibility with existing code.
 * These rules are set to 'warn' to avoid breaking existing builds.
 * Over time, these can be promoted to 'error' as code is fixed.
 */
export const baseRules = {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
        'warn',
        {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
        },
    ],
    '@typescript-eslint/no-unused-expressions': 'warn',
    '@typescript-eslint/no-empty-object-type': 'warn',
    'no-case-declarations': 'warn',
    'no-self-assign': 'warn',
    'prefer-const': 'warn',
};

// =============================================================================
// Base Config Array
// =============================================================================

/**
 * Base configuration array that all packages should spread.
 * Includes common ignores, ESLint recommended, TypeScript recommended, and Prettier.
 */
export const baseConfig = [
    { ignores },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
];

// =============================================================================
// Language Options
// =============================================================================

/**
 * Language options for Node.js/backend packages.
 */
export const nodeLanguageOptions = {
    globals: {
        ...globals.node,
        ...globals.es2020,
    },
    parser: tseslint.parser,
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
    },
};

/**
 * Language options for browser/frontend packages.
 */
export const browserLanguageOptions = {
    globals: {
        ...globals.browser,
        ...globals.es2020,
    },
    parser: tseslint.parser,
    parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
    },
};

// =============================================================================
// Specialized Rule Sets
// =============================================================================

/**
 * Rules for test files.
 * Generally more permissive than source files.
 */
export const testRules = {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
        'warn',
        {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
        },
    ],
};

/**
 * Rules for configuration files (tailwind, vite, postcss, etc.).
 * Allows CommonJS patterns and disables undef checks.
 */
export const configFileRules = {
    '@typescript-eslint/no-require-imports': 'off',
    'no-undef': 'off',
};

/**
 * React-specific rules for frontend packages.
 * Includes React Hooks rules and React Refresh for HMR.
 */
export const reactRules = {
    ...baseRules,
    'no-undef': 'off', // TypeScript handles this
};

// =============================================================================
// Re-exports
// =============================================================================

/**
 * Re-export tseslint for use in package configs.
 * Packages need this for tseslint.config() wrapper.
 */
export { tseslint };

/**
 * Re-export globals for packages that need additional globals.
 */
export { globals };

/**
 * Re-export prettier config for packages that need it directly.
 */
export { prettier };
