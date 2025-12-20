import {
    ApiKeyRepository,
    AuthenticateMessage,
    Authenticator,
    ConfigurationStore,
} from "@houseofwolves/serverlesslaunchpad.core";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export class SystemAuthenticator implements Authenticator {
    constructor(
        private readonly apiKeyRepository: ApiKeyRepository,
        private readonly configuration: ConfigurationStore<{
            auth: { cognito: { userPoolId: string; userPoolClientId: string } } | undefined;
        }>
    ) {}

    async authenticate(message: AuthenticateMessage): Promise<boolean> {
        if (message.accessToken) {
            return this.verifyAccessToken(message.accessToken);
        }

        if (message.apiKey) {
            return this.verifyApiKey(message.apiKey);
        }

        return false;
    }

    private async verifyAccessToken(accessToken: string): Promise<boolean> {
        const configuration = await this.configuration.get();
        const cognito = configuration.auth?.cognito;

        if (!cognito) {
            throw new Error("Cognito configuration not found");
        }

        const verifier = CognitoJwtVerifier.create({
            userPoolId: cognito.userPoolId,
            tokenUse: "access",
            clientId: cognito.userPoolClientId,
        });

        try {
            verifier.verify(accessToken);
        } catch (error) {
            // should throw error if not expected
            console.log(error);
            return false;
        }

        return true;
    }

    private async verifyApiKey(apiKey: string): Promise<boolean> {
        const storedApiKey = await this.apiKeyRepository.getApiKey({ apiKey });

        if (!storedApiKey) {
            return false;
        }

        return true;
    }
}
