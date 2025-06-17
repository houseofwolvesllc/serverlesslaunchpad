import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import { ApiKey } from "./types";

export abstract class ApiKeyProvider {
    abstract getApiKey(message: { apiKey: string }): Promise<ApiKey | undefined>;

    abstract getApiKeys(message: { pagingInstruction?: PagingInstruction }): Promise<Paginated<ApiKey>>;
}

export abstract class ApiKeyRepository extends ApiKeyProvider {
    abstract createApiKey(message: { apiKey: string; userId: string }): Promise<ApiKey>;

    abstract deleteApiKey(message: { apiKeyId: string }): Promise<void>;
}
