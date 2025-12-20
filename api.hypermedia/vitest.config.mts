import { configDefaults, defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
    plugins: [
        swc.vite({
            jsc: {
                parser: {
                    syntax: "typescript",
                    decorators: true,
                },
                transform: {
                    decoratorMetadata: true,
                },
                target: "esnext",
            },
        }),
    ],
    test: {
        cache: false,
        globals: false,
        exclude: [...configDefaults.exclude, "dist"],
        root: "./",
        reporters: "verbose",
        testTimeout: 10000,
    },
});