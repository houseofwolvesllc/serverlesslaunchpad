import { IVpc, Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { BaseStack, BaseStackProps } from "../base/base_stack";

export interface NetworkStackProps extends BaseStackProps {
    vpcConfig?: {
        type: "default" | "custom" | "existing";
        vpcId?: string;
    };
    description?: string;
}

/**
 * Stack for shared network infrastructure (VPC, Security Groups)
 */
export class NetworkStack extends BaseStack {
    public readonly vpc: IVpc;
    public readonly albSecurityGroup: SecurityGroup;

    constructor(scope: Construct, id: string, props: NetworkStackProps) {
        super(scope, id, props);

        this.vpc = this.createOrImportVpc(props);
        this.albSecurityGroup = this.createAlbSecurityGroup();
        this.createOutputs();
    }

    /**
     * Create or import VPC based on configuration
     */
    private createOrImportVpc(props: NetworkStackProps): IVpc {
        const vpcConfig = props.vpcConfig || { type: "default" };

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
        return new Vpc(this, this.constructId("custom_vpc"), {
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
    private createAlbSecurityGroup(): SecurityGroup {
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
     * Create stack outputs
     */
    private createOutputs(): void {
        this.exportValue(this.vpc.vpcId, {
            name: `${this.stackName}-VpcId`,
        });

        this.exportValue(this.albSecurityGroup.securityGroupId, {
            name: `${this.stackName}-AlbSecurityGroupId`,
        });
    }
}