import { Duration } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { IVpc, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
    ApplicationLoadBalancer,
    ApplicationProtocol,
    ApplicationTargetGroup,
    ListenerAction,
    ListenerCondition,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

export interface AlbStackProps extends BaseStackProps {
    vpc: IVpc;
    securityGroup: SecurityGroup;
    targetGroup: ApplicationTargetGroup;
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

        // Use pre-created resources from NetworkStack
        this.vpc = props.vpc;
        this.securityGroup = props.securityGroup;
        this.targetGroup = props.targetGroup;

        this.loadBalancer = this.createLoadBalancer();
        this.configureListeners();
        this.createOutputs();
    }

    /**
     * Create Application Load Balancer
     */
    private createLoadBalancer(): ApplicationLoadBalancer {
        const { alb } = this.configuration;

        return new ApplicationLoadBalancer(this, this.constructId("application-load-balancer"), {
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
        const httpListener = this.loadBalancer.addListener(this.constructId("http-listener"), {
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
            httpListener.addTargetGroups(this.constructId("http-target-group"), {
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

        const certificate = Certificate.fromCertificateArn(this, this.constructId("certificate"), alb.certificateArn);

        const httpsListener = this.loadBalancer.addListener(this.constructId("https-listener"), {
            protocol: ApplicationProtocol.HTTPS,
            port: 443,
            certificates: [certificate],
            defaultTargetGroups: [this.targetGroup],
        });

        // Add domain-based routing if configured
        if (alb.domainName) {
            httpsListener.addTargetGroups(this.constructId("domain-routing"), {
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
