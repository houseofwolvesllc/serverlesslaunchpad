import { Duration } from "aws-cdk-lib";
import { AccountRecovery, Mfa, UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

/**
 * Stack for Cognito User Pool and authentication
 */
export class CognitoStack extends BaseStack {
    public readonly userPool: UserPool;
    public readonly userPoolClient: UserPoolClient;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        this.userPool = this.createUserPool();
        this.userPoolClient = this.createUserPoolClient();
        this.createOutputs();
    }

    /**
     * Create Cognito User Pool with authentication settings
     */
    private createUserPool(): UserPool {
        return new UserPool(this, this.constructId("user_pool"), {
            userPoolName: this.resourceName("user_pool"),

            // Sign-in configuration
            signInAliases: this.getSignInAliases(),

            // Sign-up settings
            selfSignUpEnabled: true,
            autoVerify: {
                email: true,
            },

            // Password policy
            passwordPolicy: this.getPasswordPolicy(),

            // Account recovery
            accountRecovery: AccountRecovery.EMAIL_ONLY,

            // User attributes
            standardAttributes: this.getStandardAttributes(),

            // Security settings
            mfa: this.getMfaConfiguration(),
            mfaSecondFactor: this.getMfaSecondFactorConfiguration(),

            // Deletion protection
            removalPolicy: this.getRemovalPolicy(),
        });
    }

    /**
     * Get sign-in aliases configuration
     */
    private getSignInAliases() {
        return {
            email: true,
            username: false,
            phone: false,
        };
    }

    /**
     * Get password policy configuration
     */
    private getPasswordPolicy() {
        return {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireDigits: true,
            requireSymbols: true,
            tempPasswordValidity: Duration.days(7),
        };
    }

    /**
     * Get standard attributes configuration
     */
    private getStandardAttributes() {
        return {
            email: {
                required: true,
                mutable: true,
            },
            givenName: {
                required: false,
                mutable: true,
            },
            familyName: {
                required: false,
                mutable: true,
            },
        };
    }

    /**
     * Get MFA configuration based on environment
     */
    private getMfaConfiguration(): Mfa {
        return this.isProduction() ? Mfa.OPTIONAL : Mfa.OFF;
    }

    /**
     * Get MFA second factor configuration for production
     */
    private getMfaSecondFactorConfiguration() {
        return this.isProduction()
            ? {
                  sms: true,
                  otp: true,
              }
            : undefined;
    }

    /**
     * Create User Pool Client for web/API access
     */
    private createUserPoolClient(): UserPoolClient {
        return new UserPoolClient(this, this.constructId("user_pool_client"), {
            userPool: this.userPool,
            userPoolClientName: this.resourceName("web_client"),

            // Authentication flows
            authFlows: this.getAuthFlows(),

            // OAuth settings
            generateSecret: false, // OAuth disabled (using direct auth)

            // Token validity settings
            accessTokenValidity: Duration.hours(1),
            idTokenValidity: Duration.hours(1),
            refreshTokenValidity: Duration.days(30),

            // Security settings
            preventUserExistenceErrors: true,
        });
    }

    /**
     * Get authentication flows configuration
     */
    private getAuthFlows() {
        return {
            userPassword: true,
            userSrp: true,
            custom: false,
            adminUserPassword: false,
        };
    }


    /**
     * Create stack outputs
     */
    private createOutputs(): void {
        this.exportValue(this.userPool.userPoolId, {
            name: `${this.stackName}-UserPoolId`,
        });

        this.exportValue(this.userPoolClient.userPoolClientId, {
            name: `${this.stackName}-UserPoolClientId`,
        });

        this.exportValue(this.userPool.userPoolProviderUrl, {
            name: `${this.stackName}-UserPoolProviderUrl`,
        });
    }
}
