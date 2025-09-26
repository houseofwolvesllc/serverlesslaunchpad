import { ConfigurationStore, ConfigurationOptions, Injectable } from "@houseofwolves/serverlesslaunchpad.core";
import { SecretsConfig } from "./configuration_schemas";

/**
 * Role-based configuration store for sensitive application secrets.
 * Contains only sensitive data that should be cached for a limited time (15 minutes).
 *
 * This class extends ConfigurationStore<SecretsConfig> and provides a concrete
 * runtime type that the IoC container can distinguish from other stores.
 */
@Injectable()
export class ApplicationSecretsStore extends ConfigurationStore<SecretsConfig> {
  constructor(
    private readonly innerStore: ConfigurationStore<SecretsConfig>
  ) {
    super();
  }

  async get(options?: ConfigurationOptions): Promise<SecretsConfig> {
    return this.innerStore.get(options);
  }
}