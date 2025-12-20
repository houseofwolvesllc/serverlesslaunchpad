import { ConfigurationStore, ConfigurationOptions } from "@houseofwolves/serverlesslaunchpad.core";
import { z } from "zod";

/**
 * Composite configuration store that checks multiple sources in priority order.
 * Returns the first valid configuration found.
 */
export class CompositeConfigurationStore<T extends z.ZodType> implements ConfigurationStore<z.infer<T>> {
    private readonly stores: ConfigurationStore<z.infer<T>>[] = [];
    private readonly zodSchema: T;

    constructor(zodSchema: T) {
        this.zodSchema = zodSchema;
    }

    /**
     * Add a configuration store (checked in order added - first valid wins)
     */
    addStore(store: ConfigurationStore<z.infer<T>>): void {
        this.stores.push(store);
    }

    async get(options?: ConfigurationOptions): Promise<z.infer<T>> {
        for (const store of this.stores) {
            try {
                const config = await store.get(options);
                // Validate the configuration matches our schema
                const validated = this.zodSchema.parse(config);
                return validated;
            } catch (error) {
                // Log error but continue to next store
                console.warn(`Configuration store failed:`, error instanceof Error ? error.message : String(error));
                continue;
            }
        }

        // No valid configuration found - throw error
        throw new Error("No valid configuration found in any store");
    }
}
