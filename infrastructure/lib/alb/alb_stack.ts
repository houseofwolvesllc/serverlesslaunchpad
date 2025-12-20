import { Duration } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { IVpc, Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import {
    ApplicationLoadBalancer,
    ApplicationProtocol,
    ApplicationTargetGroup,
    ListenerAction,
    ListenerCondition,
    TargetType,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

export interface AlbStackProps extends BaseStackProps {
    vpc?: IVpc;
    vpcConfig?: {
        type: "default" | "custom" | "existing";
        vpcId?: string;
    };
    description?: string;
}

/**
 * Stack for Application Load Balancer
 */
export class AlbStack extends BaseStack {
    public readonly loadBalancer: ApplicationLoadBalancer;
    public readonly targetGroup: ApplicationTargetGroup;
    public readonly vpc: IVpc;
    public readonly securityGroup: SecurityGroup;

    constructor(scope: Construct, id: string, props: AlbStackProps) {
        super(scope, id, props);

        this.vpc = this.createOrImportVpc(props);
        this.securityGroup = this.createSecurityGroup();
        this.loadBalancer = this.createLoadBalancer();
        this.targetGroup = this.createTargetGroup();
        this.configureListeners();
        this.createOutputs();
    }

    /**
     * Create or import VPC based on configuration
     */
    private createOrImportVpc(props: AlbStackProps): IVpc {
        const vpcConfig = props.vpcConfig || { type: "custom" };

        if (props.vpc) {
            // Use explicitly provided VPC
            return props.vpc;
        }

        switch (vpcConfig.type) {
            case "default":
                return this.importDefaultVpc();
            case "existing":
                return this.importExistingVpc(vpcConfig.vpcId);
            case "custom":
            default:
                return this.createCustomVpc();
        }
    }

    /**
     * Import the default VPC
     */
    private importDefaultVpc(): IVpc {
        console.log("🔍 Looking up default VPC...");
        return Vpc.fromLookup(this, this.constructId("default_vpc"), {
            isDefault: true,
        });
    }

    /**
     * Import an existing VPC by ID
     */
    private importExistingVpc(vpcId?: string): IVpc {
        if (!vpcId) {
            throw new Error("VPC ID is required when using existing VPC");
        }
        return Vpc.fromLookup(this, this.constructId("existing_vpc"), {
            vpcId: vpcId,
        });
    }

    /**
     * Create a custom VPC with public and private subnets
     */
    private createCustomVpc(): IVpc {
        console.log("🏗️  Creating custom VPC with NAT Gateway (~$65/month)...");
        return new Vpc(this, this.constructId("alb_vpc"), {
            vpcName: this.resourceName("vpc"),
            maxAzs: 2,
            natGateways: this.isProduction() ? 2 : 1,
            subnetConfiguration: [
                {
                    name: "Public",
                    subnetType: SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: "Private",
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24,
                },
            ],
        });
    }

    /**
     * Create security group for ALB
     */
    private createSecurityGroup(): SecurityGroup {
        const securityGroup = new SecurityGroup(this, this.constructId("alb_security_group"), {
            vpc: this.vpc,
            securityGroupName: this.resourceName("alb_sg"),
            description: "Security group for Serverless Launchpad ALB",
            allowAllOutbound: true,
        });

        // Allow HTTP traffic
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), "Allow HTTP traffic");

        // Allow HTTPS traffic
        securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), "Allow HTTPS traffic");

        return securityGroup;
    }

    /**
     * Create Application Load Balancer
     */
    private createLoadBalancer(): ApplicationLoadBalancer {
        const { alb } = this.configuration;

        return new ApplicationLoadBalancer(this, this.constructId("application_load_balancer"), {
            loadBalancerName: this.resourceName("alb"),
            vpc: this.vpc,
            internetFacing: true,
            securityGroup: this.securityGroup,
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC,
            },
            idleTimeout: Duration.seconds(alb.idleTimeout),
            deletionProtection: this.isProduction(),
        });
    }

    /**
     * Create target group for Lambda
     */
    private createTargetGroup(): ApplicationTargetGroup {
        const { alb } = this.configuration;

        return new ApplicationTargetGroup(this, this.constructId("lambda_target_group"), {
            targetGroupName: this.resourceName("lambda_tg"),
            targetType: TargetType.LAMBDA,
            vpc: this.vpc,
            healthCheck: {
                enabled: true,
                path: alb.healthCheckPath,
                interval: Duration.seconds(alb.healthCheckInterval),
                timeout: Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
            },
        });
    }

    /**
     * Configure ALB listeners for HTTP and HTTPS
     */
    private configureListeners(): void {
        this.configureHttpListener();
        this.configureHttpsListener();
    }

    /**
     * Configure HTTP listener with redirect to HTTPS
     */
    private configureHttpListener(): void {
        const httpListener = this.loadBalancer.addListener(this.constructId("http_listener"), {
            protocol: ApplicationProtocol.HTTP,
            port: 80,
            defaultAction: ListenerAction.redirect({
                protocol: "HTTPS",
                port: "443",
                permanent: true,
            }),
        });

        // For non-production, allow HTTP traffic to target group
        if (!this.isProduction() && !this.configuration.alb.certificateArn) {
            httpListener.addTargetGroups(this.constructId("http_target_group"), {
                targetGroups: [this.targetGroup],
            });
        }
    }

    /**
     * Configure HTTPS listener if certificate is provided
     */
    private configureHttpsListener(): void {
        const { alb } = this.configuration;

        if (!alb.certificateArn) {
            console.log("⚠️  No certificate ARN provided - HTTPS listener not created");
            return;
        }

        const certificate = Certificate.fromCertificateArn(
            this,
            this.constructId("certificate"),
            alb.certificateArn
        );

        const httpsListener = this.loadBalancer.addListener(this.constructId("https_listener"), {
            protocol: ApplicationProtocol.HTTPS,
            port: 443,
            certificates: [certificate],
            defaultTargetGroups: [this.targetGroup],
        });

        // Add domain-based routing if configured
        if (alb.domainName) {
            httpsListener.addTargetGroups(this.constructId("domain_routing"), {
                targetGroups: [this.targetGroup],
                conditions: [ListenerCondition.hostHeaders([alb.domainName])],
                priority: 10,
            });
        }
    }

    /**
     * Create stack outputs
     */
    private createOutputs(): void {
        this.exportValue(this.loadBalancer.loadBalancerArn, {
            name: `${this.stackName}-LoadBalancerArn`,
        });

        this.exportValue(this.targetGroup.targetGroupArn, {
            name: `${this.stackName}-TargetGroupArn`,
        });

        this.exportValue(this.vpc.vpcId, {
            name: `${this.stackName}-VpcId`,
        });

        this.exportValue(this.loadBalancer.loadBalancerDnsName, {
            name: `${this.stackName}-LoadBalancerDnsName`,
        });
    }
}