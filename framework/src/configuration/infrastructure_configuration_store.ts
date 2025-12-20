import { ConfigurationStore, ConfigurationOptions, Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { ApiConfig } from "./configuration_schemas";

/**
 * Role-based configuration store for infrastructure settings.
 * Contains non-sensitive configuration data that can be cached indefinitely.
 *
 * This class extends ConfigurationStore<ApiConfig> and provides a concrete
 * runtime type that the IoC container can distinguish from other stores.
 */
@Injectable()
export class InfrastructureConfigurationStore extends ConfigurationStore<ApiConfig> {
  constructor(
    private readonly innerStore: ConfigurationStore<ApiConfig>
  ) {
    super();
  }

  async get(options?: ConfigurationOptions): Promise<ApiConfig> {
    return this.innerStore.get(options);
  }
}