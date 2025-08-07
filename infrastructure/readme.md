# Serverless Launchpad Infrastructure

AWS CDK infrastructure for the Serverless Launchpad project.

## Quick Start

### Prerequisites

1. **AWS CLI configured** with named profiles: `aws configure --profile <profile-name>`
2. **Node.js 20+** installed
3. **AWS CDK CLI** installed: `npm install -g aws-cdk`
4. **API application built**: Run `npm run build` in `../api.hypermedia`

### Initial Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   # Copy and edit environment configuration
   cp environments/.env.development environments/.env.development.local
   # Edit the file with your AWS profile name and settings
   ```

3. **Bootstrap CDK** (first time only):
   ```bash
   npx cdk bootstrap
   ```

### Deployment

#### First Time Deployment
When deploying for the first time, you'll be prompted to choose a VPC configuration:

- **Default VPC (Recommended)** - Free, uses AWS's default VPC
  - ✅ No NAT Gateway costs (~$65/month savings)
  - ✅ Perfect for serverless workloads
  - ✅ Faster Lambda cold starts
  
- **Custom VPC** - Creates new VPC with NAT Gateway
  - ⚠️ Costs ~$65/month for NAT Gateway
  - ✅ Network isolation
  - ✅ Custom CIDR ranges

Your choice is saved in `environments/.vpc.{environment}.json` for future deployments.

#### Development Environment
```bash
# Deploy all stacks to development
npm run deploy

# Deploy specific stack
npm run deploy -- --stack secrets
npm run deploy -- --stack data
npm run deploy -- --stack cognito
npm run deploy -- --stack network
npm run deploy -- --stack lambda
npm run deploy -- --stack alb
```

#### Production Environment
```bash
# Set up production environment file first
cp environments/.env.production environments/.env.production.local
# Edit with production values (AWS profile, certificate ARN, etc.)

# Deploy to production
npm run deploy -- --environment production
```

### Useful Commands

```bash
# Synthesize CloudFormation templates
npm run synth

# Show differences
npm run cdk:diff

# Destroy resources (development only)
npm run destroy

# Destroy production (requires --force)
npm run destroy -- --environment production --force
```

## Architecture

The infrastructure uses a **three-stack architecture** that eliminates circular dependencies:

### Stack Overview
- **Secrets Stack**: AWS Secrets Manager for configuration
- **Data Stack**: S3 buckets and Athena workgroup  
- **Cognito Stack**: User pool and authentication
- **Network Stack**: Shared VPC and ALB security groups
- **Lambda Stack**: API Lambda function, target group, and IAM roles
- **ALB Stack**: Application Load Balancer using shared network resources

### Dependency Chain
```
Secrets/Data/Cognito Stacks (independent)
         ↓
   Network Stack (VPC, Security Groups)
         ↓
   Lambda Stack (Function + Target Group)
         ↓  
   ALB Stack (Load Balancer)
```

### Key Design Benefits
- ✅ **No circular dependencies** - Clean linear dependency chain
- ✅ **Shared VPC** - ALB uses VPC, Lambda runs outside VPC for internet access
- ✅ **Modular deployment** - Deploy stacks independently when needed
- ✅ **Type safety** - No optional properties or complex initialization
- ✅ **Cost optimized** - No NAT Gateway needed ($0 vs $32+/month)
- ✅ **Full internet access** - Lambda can call external APIs (ChatGPT, webhooks, etc.)

### VPC Configuration

The Network Stack handles VPC creation/lookup based on environment configuration:

- **Default VPC (default)** - Uses existing default VPC in the region
  - ✅ Free (no additional costs)
  - ✅ Perfect for ALB deployment
  - ✅ Lambda runs outside VPC with full internet access
  - ⚠️ Requires default VPC to exist in region

- **Custom VPC** - Creates new VPC with public/private subnets
  - ✅ No NAT Gateway needed (Lambda outside VPC)
  - ✅ Custom CIDR ranges for ALB
  - ✅ Ready for future VPC resources (RDS, Redis)

- **Existing VPC** - Import specific VPC by ID
  - Configure via `VPC_CONFIG=existing` and `VPC_ID=vpc-xxxxxx`

### Lambda Network Architecture

- **Default**: Lambda runs OUTSIDE VPC for full internet access
- **Benefits**: 
  - ✅ Can call external APIs (ChatGPT, Stripe, webhooks, etc.)
  - ✅ No NAT Gateway costs ($0 vs $32+/month)
  - ✅ AWS services secured via IAM (not network-based)
  - ✅ Simpler architecture
- **ALB**: Always uses VPC (required for load balancing)
- **Target Groups**: Bridge between VPC (ALB) and Lambda

### When to Put Lambda in VPC

Lambda VPC configuration is commented out but easily enabled when you need:
- 🗄️ **RDS/Aurora** database access
- 📦 **ElastiCache/Redis** access  
- 🔍 **Elasticsearch** cluster access
- 🔒 **Network isolation** for compliance

To enable, uncomment the VPC configuration in `api_lambda_stack.ts`.

## Configuration

Configuration is managed via:

1. **Environment files**: `environments/.env.{environment}`
2. **Stack configuration**: `config/stack_configuration.ts`
3. **AWS Secrets Manager**: Runtime application configuration

## Environment Variables

### Required
- `AWS_PROFILE`: Named AWS profile (configured via `aws configure --profile <name>`)

### Optional
- `CERTIFICATE_ARN`: SSL certificate for HTTPS (recommended for production)
- `DOMAIN_NAME`: Custom domain name

## Post-Deployment Setup

After deployment, you need to:

1. **Update Secrets Manager** with actual configuration values
2. **Set up Cognito User Pool** and update the secret
3. **Configure strong session salt**
4. **Set up domain and certificate** (for production)

### Updating Secrets

```bash
# Get the secret ARN from stack outputs
aws secretsmanager put-secret-value \
  --secret-id "serverlesslaunchpad/development" \
  --secret-string '{
    "environment": "development",
    "cognito": {
      "userPoolId": "us-east-1_XXXXXXXXX",
      "userPoolClientId": "your-client-id"
    },
    "session": {
      "tokenSalt": "your-random-salt-here"
    }
  }'
```

## Testing

After deployment, test the endpoint:

```bash
# Get ALB DNS name from stack outputs
curl https://your-alb-dns-name/health
```

## Monitoring

- **CloudWatch Logs**: Lambda execution logs
- **CloudWatch Metrics**: ALB and Lambda metrics
- **AWS X-Ray**: Distributed tracing (if enabled)

## Security

- All resources follow least privilege principle
- Production resources have deletion protection
- Secrets are encrypted with KMS
- S3 buckets block public access

## Cost Optimization

- Development: Aggressive cleanup policies
- Staging: Medium retention periods
- Production: Long-term retention with lifecycle rules

## Troubleshooting

### Common Issues

1. **Bootstrap required**: Run `npx cdk bootstrap`
2. **Permissions**: Ensure AWS credentials have necessary permissions
3. **Certificate**: For HTTPS, certificate must be in same region as ALB
4. **Build**: Ensure API application is built before deployment
5. **VPC Lookup Failed**: If default VPC lookup fails, clear context: `rm cdk.context.json`
6. **Change VPC Type**: Delete `environments/.vpc.{environment}.json` and redeploy

### Getting Help

- Check CloudFormation events in AWS Console
- Review CloudWatch logs for Lambda execution
- Use `npm run cdk:diff` to see what will change

## Development

### Adding New Resources

1. Update `config/stack_configuration.ts` if needed
2. Modify or create stack in `lib/`
3. Update `bin/app.ts` to include new stack
4. Add dependencies between stacks (maintain linear dependency chain)
5. Test in development environment first

### Stack Organization

```
lib/
├── base/
│   └── base_stack.ts        # Common stack functionality
├── network/
│   └── network_stack.ts     # VPC and security groups
├── lambda/  
│   └── api_lambda_stack.ts  # Lambda function and target group
├── alb/
│   └── alb_stack.ts         # Application Load Balancer
├── data/
│   └── athena_stack.ts      # S3 and Athena resources
├── auth/
│   └── cognito_stack.ts     # User authentication
└── secrets/
    └── secrets_stack.ts     # Configuration management
```

### Best Practices

- Always test in development first
- Use proper removal policies
- Follow naming conventions
- Add comprehensive tags
- Document configuration changes