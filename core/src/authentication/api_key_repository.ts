import { Paginated, PagingInstruction } from "@houseofwolves/serverlesslaunchpad.commons";
import { User } from "../users";

export abstract class ApiKeyProvider {
    abstract getApiKeys(message: GetApiKeysMessage): Promise<Paginated<ApiKey>>;
}

export abstract class ApiKeyRepository extends ApiKeyProvider {
    abstract createApiKey(message: CreateApiKeyMessage): Promise<ApiKey>;
    abstract verifyApiKey(message: VerifyApiKeyMessage): Promise<VerifyApiKeyResult | undefined>;
    abstract deleteApiKey(message: DeleteApiKeyMessage): Promise<void>;
}

export type ApiKey = {
    apiKeyId: string;
    userId: string;
    apiKey: string;
    description: string;
    dateCreated: Date;
    dateLastAccessed: Date;
};

export type VerifyApiKeyResult = {
    apiKey: ApiKey;
    user: User;
};

export type GetApiKeysMessage = {
    pagingInstruction?: PagingInstruction;
};

export type CreateApiKeyMessage = {
    apiKey: string;
    userId: string;
};

export type VerifyApiKeyMessage = {
    apiKey: string;
};

export type DeleteApiKeyMessage = {
    apiKey: string;
};
