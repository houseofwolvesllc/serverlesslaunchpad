import { Injectable, JwtVerifier } from "@houseofwolves/serverlesslaunchpad.core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { InfrastructureConfigurationStore } from "../configuration/infrastructure_configuration_store";

@Injectable()
export class JoseJwtVerifier extends JwtVerifier {
    constructor(private readonly infrastructureConfig: InfrastructureConfigurationStore) {
        super();
    }

    async verify(accessToken: string): Promise<boolean> {
        try {
            const infraConfig = await this.infrastructureConfig.get();

            // Build JWKS URL (works for both local and production)
            const jwksUrl = this.buildJwksUrl(infraConfig);
            const JWKS = createRemoteJWKSet(new URL(jwksUrl));

            // Build expected issuer(s)
            const expectedIssuers = this.buildExpectedIssuers(infraConfig);

            // Verify token with issuer and audience validation
            await jwtVerify(accessToken, JWKS, {
                issuer: expectedIssuers,
                audience: infraConfig.cognito.client_id,
            });

            return true;
        } catch (error) {
            return false;
        }
    }

    private buildJwksUrl(config: any): string {
        const poolId = config.cognito.user_pool_id;

        if (config.cognito.endpoint_url) {
            // Local development: cognito-local
            return `${config.cognito.endpoint_url}/${poolId}/.well-known/jwks.json`;
        }

        // Production: AWS Cognito - use aws.region from config
        const region = config.aws.region;
        return `https://cognito-idp.${region}.amazonaws.com/${poolId}/.well-known/jwks.json`;
    }

    private buildExpectedIssuers(config: any): string[] {
        const poolId = config.cognito.user_pool_id;

        if (config.cognito.endpoint_url) {
            // Local development: accept both localhost and 0.0.0.0 (cognito-local quirk)
            const baseUrl = config.cognito.endpoint_url;
            return [
                `${baseUrl}/${poolId}`,
                `${baseUrl.replace('localhost', '0.0.0.0')}/${poolId}`,
                `${baseUrl.replace('0.0.0.0', 'localhost')}/${poolId}`,
            ];
        }

        // Production: AWS Cognito issuer - use aws.region from config
        const region = config.aws.region;
        return [`https://cognito-idp.${region}.amazonaws.com/${poolId}`];
    }
}
