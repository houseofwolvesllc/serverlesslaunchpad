import { Duration } from "aws-cdk-lib";
import { CfnWorkGroup } from "aws-cdk-lib/aws-athena";
import { BlockPublicAccess, Bucket, BucketEncryption, LifecycleRule } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

/**
 * Stack for Athena and data infrastructure
 */
export class AthenaStack extends BaseStack {
    public readonly dataBucket: Bucket;
    public readonly queryResultsBucket: Bucket;
    public readonly athenaWorkGroup: CfnWorkGroup;

    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, props);

        this.dataBucket = this.createDataBucket();
        this.queryResultsBucket = this.createQueryResultsBucket();
        this.athenaWorkGroup = this.createAthenaWorkGroup();
        this.createOutputs();
    }

    /**
     * Create S3 bucket for data storage
     */
    private createDataBucket(): Bucket {
        return new Bucket(this, this.constructId("data_bucket"), {
            bucketName: `${this.environment}.serverlesslaunchpad.data`,
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            versioned: this.isProduction(),
            removalPolicy: this.getRemovalPolicy(),
            autoDeleteObjects: !this.isProduction(),
        });
    }

    /**
     * Create S3 bucket for Athena query results
     */
    private createQueryResultsBucket(): Bucket {
        return new Bucket(this, this.constructId("query_results_bucket"), {
            bucketName: `${this.environment}.serverlesslaunchpad.results`,
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            versioned: this.isProduction(),
            removalPolicy: this.getRemovalPolicy(),
            autoDeleteObjects: !this.isProduction(),
            lifecycleRules: this.createQueryResultsLifecycleRules(),
        });
    }

    /**
     * Create lifecycle rules for query results bucket
     */
    private createQueryResultsLifecycleRules(): LifecycleRule[] {
        const { athena } = this.configuration;

        const rules: LifecycleRule[] = [
            {
                id: "DeleteOldQueryResults",
                enabled: true,
                expiration: Duration.days(athena.resultsBucketRetention),
            },
        ];

        return rules;
    }

    /**
     * Create Athena workgroup for query execution
     */
    private createAthenaWorkGroup(): CfnWorkGroup {
        const { athena } = this.configuration;

        return new CfnWorkGroup(this, this.constructId("athena_work_group"), {
            name: athena.workGroupName,
            description: `Athena workgroup for Serverless Launchpad ${this.environment} environment`,
            workGroupConfiguration: this.getWorkGroupConfiguration(),
            tags: this.getWorkGroupTags(),
        });
    }

    /**
     * Get Athena workgroup configuration
     */
    private getWorkGroupConfiguration() {
        const { athena } = this.configuration;

        return {
            resultConfiguration: {
                outputLocation: `s3://${this.queryResultsBucket.bucketName}/`,
                encryptionConfiguration: {
                    encryptionOption: "SSE_S3",
                },
            },
            enforceWorkGroupConfiguration: athena.enforceWorkGroupConfiguration,
            publishCloudWatchMetricsEnabled: athena.publishCloudWatchMetrics,
            engineVersion: {
                selectedEngineVersion: "Athena engine version 3",
            },
        };
    }

    /**
     * Get tags for Athena workgroup
     */
    private getWorkGroupTags() {
        return [
            { key: "Environment", value: this.environment },
            { key: "Purpose", value: "QueryExecution" },
        ];
    }

    /**
     * Create stack outputs
     */
    private createOutputs(): void {
        this.exportValue(this.dataBucket.bucketName, {
            name: `${this.stackName}-DataBucketName`,
        });

        this.exportValue(this.queryResultsBucket.bucketName, {
            name: `${this.stackName}-QueryResultsBucketName`,
        });

        this.exportValue(this.athenaWorkGroup.name!, {
            name: `${this.stackName}-WorkGroupName`,
        });
    }
}
