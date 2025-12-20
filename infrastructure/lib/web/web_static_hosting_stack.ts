import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

export type WebPackageName = "mantine" | "shadcn" | "daisyui" | "svelte";

export interface WebStaticHostingStackProps extends BaseStackProps {
    webPackageName: WebPackageName;
}

/**
 * Stack for hosting static web frontend assets via S3 website hosting
 * Each web package (mantine, shadcn, daisyui, svelte) gets its own stack
 * Designed to work with Cloudflare as the CDN layer (Flexible SSL mode)
 */
export class WebStaticHostingStack extends BaseStack {
    public readonly bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: WebStaticHostingStackProps) {
        super(scope, id, props);

        const { webPackageName } = props;
        const isProduction = this.isProduction();

        // Create S3 bucket with website hosting enabled
        this.bucket = new s3.Bucket(this, this.constructId(`web-bucket-${webPackageName}`), {
            bucketName: this.resourceName(`web-${webPackageName}-${this.account}`),
            websiteIndexDocument: "index.html",
            websiteErrorDocument: "index.html", // SPA routing
            publicReadAccess: true,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                ignorePublicAcls: false,
                blockPublicPolicy: false,
                restrictPublicBuckets: false,
            }),
            removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
            autoDeleteObjects: !isProduction,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: isProduction,
        });

        // Outputs
        new CfnOutput(this, `BucketName`, {
            value: this.bucket.bucketName,
            description: `S3 bucket name for ${webPackageName} web frontend`,
            exportName: this.resourceName(`web-${webPackageName}-bucket`),
        });

        new CfnOutput(this, `WebsiteURL`, {
            value: this.bucket.bucketWebsiteUrl,
            description: `S3 website URL for ${webPackageName} web frontend`,
            exportName: this.resourceName(`web-${webPackageName}-website-url`),
        });

        new CfnOutput(this, `WebsiteDomainName`, {
            value: this.bucket.bucketWebsiteDomainName,
            description: `S3 website domain name for ${webPackageName} web frontend`,
            exportName: this.resourceName(`web-${webPackageName}-website-domain`),
        });
    }
}
