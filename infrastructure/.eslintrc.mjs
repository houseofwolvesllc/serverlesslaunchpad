export default [
    {
        env: {
            es2021: true,
            node: true,
        },
        extends: [
            "eslint:recommended",
            "plugin:@typescript-eslint/recommended",
            "plugin:import/recommended",
            "plugin:import/typescript",
            "plugin:prettier/recommended",
        ],
        overrides: [
            { files: ["packages/**/*.{js,jsx,ts,tsx}"] },
            {
                env: {
                    node: true,
                },
                files: [".eslintrc.{js,cjs}"],
                parserOptions: {
                    sourceType: "script",
                },
            },
            {
                files: ["*.ts", "*.tsx"],
                rules: {
                    "@typescript-eslint/explicit-module-boundary-types": "warn",
                },
            },
            {
                files: ["*.mjs"],
                rules: {
                    "no-undef": 0,
                },
            },
            {
                files: ["cdk/**", "**/recipes/**"],
                rules: {
                    "import/no-extraneous-dependencies": "off",
                },
            },
        ],
        parser: "@typescript-eslint/parser",
        parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
        },
        plugins: ["@typescript-eslint", "import", "prettier"],
        rules: {
            "linebreak-style": "off",
            semi: ["error", "always"],
            quotes: ["error", "double", { avoidEscape: true }],
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ],
            "no-unused-vars": "off",
            "import/no-extraneous-dependencies": [
                "error",
                {
                    devDependencies: true,
                    optionalDependencies: false,
                    peerDependencies: true,
                },
            ],
            "import/order": [
                "warn",
                {
                    // https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md
                    groups: ["type", "builtin", "external", "internal", "parent", "sibling", "index", "object"],
                    pathGroups: [
                        {
                            pattern: "@houseofwolves/*",
                            group: "builtin",
                            position: "before",
                        },
                    ],
                    "newlines-between": "never",
                    alphabetize: {
                        order: "asc",
                        caseInsensitive: true,
                    },
                },
            ],
            "prettier/prettier": [
                "error",
                {
                    endOfLine: "auto",
                },
            ],
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/explicit-function-return-type": "off",
        },
        settings: {
            "import/resolver": {
                node: true,
                typescript: {
                    project: ["packages/*/tsconfig.json"],
                },
            },
        },
    },
];
