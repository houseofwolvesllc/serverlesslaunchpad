import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

export type WebPackageName = "mantine" | "shadcn" | "daisyui" | "svelte";

export interface WebStaticHostingStackProps extends BaseStackProps {
    webPackageName: WebPackageName;
}

/**
 * Stack for hosting static web frontend assets via S3 and CloudFront
 * Each web package (mantine, shadcn, daisyui, svelte) gets its own stack
 */
export class WebStaticHostingStack extends BaseStack {
    public readonly bucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;

    constructor(scope: Construct, id: string, props: WebStaticHostingStackProps) {
        super(scope, id, props);

        const { webPackageName } = props;
        const isProduction = this.isProduction();

        // Create S3 bucket for static hosting
        this.bucket = new s3.Bucket(this, this.constructId(`web-bucket-${webPackageName}`), {
            bucketName: this.resourceName(`web-${webPackageName}-${this.account}`),
            removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
            autoDeleteObjects: !isProduction,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: isProduction,
        });

        // Create CloudFront distribution using S3BucketOrigin (new API)
        this.distribution = new cloudfront.Distribution(
            this,
            this.constructId(`distribution-${webPackageName}`),
            {
                defaultBehavior: {
                    origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                },
                defaultRootObject: "index.html",
                errorResponses: [
                    {
                        httpStatus: 403,
                        responseHttpStatus: 200,
                        responsePagePath: "/index.html", // SPA routing
                        ttl: undefined,
                    },
                    {
                        httpStatus: 404,
                        responseHttpStatus: 200,
                        responsePagePath: "/index.html", // SPA routing
                        ttl: undefined,
                    },
                ],
                comment: `Serverless Launchpad ${webPackageName} frontend - ${this.appEnvironment}`,
                enabled: true,
                priceClass: isProduction
                    ? cloudfront.PriceClass.PRICE_CLASS_ALL
                    : cloudfront.PriceClass.PRICE_CLASS_100, // Cheaper for non-prod
            }
        );

        // Outputs
        new CfnOutput(this, `BucketName`, {
            value: this.bucket.bucketName,
            description: `S3 bucket name for ${webPackageName} web frontend`,
            exportName: this.resourceName(`web-${webPackageName}-bucket`),
        });

        new CfnOutput(this, `DistributionDomainName`, {
            value: this.distribution.distributionDomainName,
            description: `CloudFront distribution domain for ${webPackageName} web frontend`,
            exportName: this.resourceName(`web-${webPackageName}-domain`),
        });

        new CfnOutput(this, `DistributionId`, {
            value: this.distribution.distributionId,
            description: `CloudFront distribution ID for ${webPackageName} web frontend`,
            exportName: this.resourceName(`web-${webPackageName}-distribution-id`),
        });
    }
}
