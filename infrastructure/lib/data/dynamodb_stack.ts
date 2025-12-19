import { AttributeType, BillingMode, Table, ProjectionType } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

/**
 * Stack for DynamoDB tables used by the Hypermedia API
 */
export class DynamoDbStack extends BaseStack {
    public readonly usersTable: Table;
    public readonly sessionsTable: Table;
    public readonly apiKeysTable: Table;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        this.usersTable = this.createUsersTable();
        this.sessionsTable = this.createSessionsTable();
        this.apiKeysTable = this.createApiKeysTable();

        this.createOutputs();
    }

    /**
     * Generate table name with underscore separator (slp_{env}_{name})
     * DynamoDB tables use underscores to match the table prefix in DynamoDbClientFactory
     */
    private tableName(name: string): string {
        return `slp_${this.appEnvironment}_${name}`;
    }

    /**
     * Create the users table
     * - Primary key: userId (HASH)
     * - GSI: email-index for getUserByEmail queries
     */
    private createUsersTable(): Table {
        const table = new Table(this, this.constructId("users-table"), {
            tableName: this.tableName("users"),
            partitionKey: { name: "userId", type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: this.getRemovalPolicy(),
            pointInTimeRecovery: this.isProduction(),
        });

        table.addGlobalSecondaryIndex({
            indexName: "email-index",
            partitionKey: { name: "email", type: AttributeType.STRING },
            projectionType: ProjectionType.ALL,
        });

        return table;
    }

    /**
     * Create the sessions table
     * - Primary key: userId (HASH), sessionId (RANGE)
     * - GSI: sessionSignature-index for signature lookups
     */
    private createSessionsTable(): Table {
        const table = new Table(this, this.constructId("sessions-table"), {
            tableName: this.tableName("sessions"),
            partitionKey: { name: "userId", type: AttributeType.STRING },
            sortKey: { name: "sessionId", type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: this.getRemovalPolicy(),
            pointInTimeRecovery: this.isProduction(),
        });

        table.addGlobalSecondaryIndex({
            indexName: "sessionSignature-index",
            partitionKey: { name: "sessionSignature", type: AttributeType.STRING },
            projectionType: ProjectionType.ALL,
        });

        return table;
    }

    /**
     * Create the API keys table
     * - Primary key: userId (HASH), apiKeyId (RANGE)
     * - GSI: apiKey-index for key lookups during authentication
     */
    private createApiKeysTable(): Table {
        const table = new Table(this, this.constructId("api-keys-table"), {
            tableName: this.tableName("api_keys"),
            partitionKey: { name: "userId", type: AttributeType.STRING },
            sortKey: { name: "apiKeyId", type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: this.getRemovalPolicy(),
            pointInTimeRecovery: this.isProduction(),
        });

        table.addGlobalSecondaryIndex({
            indexName: "apiKey-index",
            partitionKey: { name: "apiKey", type: AttributeType.STRING },
            projectionType: ProjectionType.ALL,
        });

        return table;
    }

    /**
     * Create stack outputs
     */
    private createOutputs(): void {
        this.exportValue(this.usersTable.tableArn, {
            name: `${this.stackName}-UsersTableArn`,
        });
        this.exportValue(this.sessionsTable.tableArn, {
            name: `${this.stackName}-SessionsTableArn`,
        });
        this.exportValue(this.apiKeysTable.tableArn, {
            name: `${this.stackName}-ApiKeysTableArn`,
        });
    }
}
