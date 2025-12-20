import swc from "unplugin-swc";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        cache: false,
        globals: false,
        exclude: [...configDefaults.exclude, "dist"],
        root: "./",
        reporters: "verbose",
        testTimeout: 10000,
    },
    plugins: [swc.vite()],
});
