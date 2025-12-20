import { Duration, SecretValue } from "aws-cdk-lib";
import { Alias, Key } from "aws-cdk-lib/aws-kms";
import { RotationSchedule, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

/**
 * Stack for managing secrets and configuration
 */
export class SecretsStack extends BaseStack {
    public readonly configurationSecret: Secret;
    public readonly encryptionKey?: Key;
    private keyAlias?: Alias;
    private rotationSchedule?: RotationSchedule;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        this.encryptionKey = this.createEncryptionKey();
        this.configurationSecret = this.createConfigurationSecret();
        this.configureSecretRotation();
        this.createOutputs();
    }

    /**
     * Create KMS encryption key for production environments
     */
    private createEncryptionKey(): Key | undefined {
        const { secrets } = this.configuration;

        if (!secrets.kmsKeyAlias || !this.isProduction()) {
            return undefined;
        }

        const key = new Key(this, this.constructId("secrets_encryption_key"), {
            description: `Encryption key for ${this.stackName} secrets`,
            enableKeyRotation: true,
            removalPolicy: this.getRemovalPolicy(),
        });

        this.createKeyAlias(key);
        return key;
    }

    /**
     * Create KMS key alias for easier reference
     */
    private createKeyAlias(key: Key): void {
        const { secrets } = this.configuration;

        this.keyAlias = new Alias(this, this.constructId("secrets_encryption_key_alias"), {
            aliasName: secrets.kmsKeyAlias!,
            targetKey: key,
        });
    }

    /**
     * Create the main configuration secret
     */
    private createConfigurationSecret(): Secret {
        const { secrets } = this.configuration;

        return new Secret(this, this.constructId("configuration_secret"), {
            secretName: secrets.secretName,
            description: `Secrets for Serverless Launchpad ${this.environment} environment`,
            encryptionKey: this.encryptionKey,
            removalPolicy: this.getRemovalPolicy(),
            secretStringValue: this.getInitialSecretValue(),
        });
    }

    /**
     * Get initial secret value with environment-specific configuration
     */
    private getInitialSecretValue(): SecretValue {
        const initialConfiguration = {
            STS: this.getSessionTokenSalt(),
        };

        return SecretValue.unsafePlainText(JSON.stringify(initialConfiguration));
    }

    /**
     * Get session token salt from environment or generate a secure one
     */
    private getSessionTokenSalt(): string {
        const salt = process.env.SESSION_TOKEN_SALT;

        if (!salt) {
            console.log(`🔐 Generating new SESSION_TOKEN_SALT for ${this.environment} environment`);
            return this.generateSecureTokenSalt();
        }

        console.log(`✅ Using existing SESSION_TOKEN_SALT for ${this.environment} environment`);
        return salt;
    }

    /**
     * Generate a cryptographically secure token salt
     */
    private generateSecureTokenSalt(): string {
        const crypto = require("crypto");

        // Generate 64 bytes (128 hex characters) of random data
        // This provides excellent entropy for session token signing
        return crypto.randomBytes(64).toString("hex");
    }

    /**
     * Configure secret rotation for production environments
     */
    private configureSecretRotation(): void {
        const { secrets } = this.configuration;

        if (!secrets.rotationDays || !this.isProduction()) {
            return;
        }

        this.rotationSchedule = new RotationSchedule(this, this.constructId("configuration_secret_rotation"), {
            secret: this.configurationSecret,
            rotationLambda: undefined, // Will use default rotation function
            automaticallyAfter: Duration.days(secrets.rotationDays),
        });
    }

    /**
     * Create stack outputs
     */
    private createOutputs(): void {
        this.exportValue(this.configurationSecret.secretArn, {
            name: `${this.stackName}-SecretArn`,
        });

        if (this.encryptionKey) {
            this.exportValue(this.encryptionKey.keyArn, {
                name: `${this.stackName}-EncryptionKeyArn`,
            });
        }
    }
}
