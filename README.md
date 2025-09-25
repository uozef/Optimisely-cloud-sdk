# Optimisely Cloud SDK

[![npm version](https://badge.fury.io/js/%40optimisely%2Fcloud-sdk.svg)](https://badge.fury.io/js/%40optimisely%2Fcloud-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A comprehensive Node.js SDK and command-line tool for scanning, analyzing, and optimizing cloud infrastructure across AWS, Azure, and Google Cloud Platform.

## 🚀 Features

- **Multi-Cloud Support**: Seamlessly scan AWS, Azure, and GCP resources
- **Resource Discovery**: Automatically discover compute, storage, database, network, and serverless resources
- **Cost Analysis**: Get detailed cost breakdowns and estimates
- **Optimization Recommendations**: Receive AI-powered suggestions to reduce costs and improve performance
- **CLI Tool**: Powerful command-line interface for easy integration
- **TypeScript Support**: Fully typed for better development experience
- **Export Formats**: Support for JSON, YAML, CSV, and table formats
- **Terraform Generation**: Generate Infrastructure as Code from scanned resources
- **Multi-Cloud IaC**: Support for AWS, Azure, and GCP Terraform providers
- **Optimization Integration**: Apply cost optimizations to generated Terraform

## 📦 Installation

### As a Node.js package:
```bash
npm install optimisely-cloud-sdk
```

### As a global CLI tool:
```bash
npm install -g optimisely-cloud-sdk

# Now you can use the 'optimisely' command anywhere
optimisely scan --provider aws --region us-east-1
```

## 🏗️ Supported Services

### AWS (Amazon Web Services)
- **Compute**: EC2 Instances
- **Storage**: S3 Buckets
- **Database**: RDS Instances
- **Network**: VPCs, Subnets, Security Groups
- **Serverless**: Lambda Functions

### Azure (Microsoft Azure)
- **Compute**: Virtual Machines
- **Storage**: Storage Accounts
- **Network**: Virtual Networks

### GCP (Google Cloud Platform)
- **Compute**: Compute Engine Instances
- **Storage**: Cloud Storage Buckets
- **Network**: VPC Networks

## 🔧 CLI Usage

### Configure Credentials
```bash
# Interactive configuration
optimisely configure

# Or configure specific provider
optimisely configure --provider aws
```

### Scan Cloud Resources
```bash
# Basic scan
optimisely scan --provider aws --region us-east-1

# Comprehensive scan with cost analysis and optimization
optimisely scan --provider aws --region us-east-1 \
  --include-cost-analysis \
  --include-optimization \
  --output results.json

# Scan specific resource types
optimisely scan --provider azure \
  --include-types compute,storage \
  --exclude-regions eastus2,westus

# Export in different formats
optimisely scan --provider gcp \
  --format table \
  --output report.csv
```

### Cost Analysis
```bash
# Analyze costs across all resources
optimisely cost --provider aws --region us-east-1

# Save cost analysis to file
optimisely cost --provider azure --output costs.json
```

### Get Optimization Recommendations
```bash
# Get medium and high severity recommendations
optimisely optimize --provider aws --severity medium

# Get all recommendations and save to file
optimisely optimize --provider gcp --severity low --output optimizations.json
```

### List Supported Providers
```bash
optimisely providers
```

### Generate Terraform Infrastructure as Code
```bash
# Generate from existing scan results
optimisely terraform --input scan-results.json --output ./terraform --variables --outputs

# Scan and generate Terraform in one step
optimisely terraform --provider aws --region us-east-1 --rescan --output ./terraform --variables --outputs

# Generate with optimization recommendations applied
optimisely terraform --provider aws --rescan --optimized --output ./terraform-optimized

# Generate modular Terraform structure
optimisely terraform --input scan-results.json --modules --output ./terraform-modules
```

## 💻 SDK Usage

### Basic Usage

```typescript
import { OptimiselySDK } from 'optimisely-cloud-sdk';

const sdk = new OptimiselySDK();

const config = {
  provider: 'aws',
  credentials: {
    aws: {
      accessKeyId: 'your-access-key-id',
      secretAccessKey: 'your-secret-access-key',
      region: 'us-east-1'
    }
  }
};

// Scan all resources
const result = await sdk.scanCloud(config, {
  includeCostAnalysis: true,
  includeOptimizationRecommendations: true
});

console.log(`Found ${result.totalResources} resources`);
console.log(`Estimated monthly cost: $${result.estimatedMonthlyCost.total}`);
console.log(`Optimization opportunities: ${result.optimizationOpportunities.length}`);
```

### Multi-Provider Scanning

```typescript
import { OptimiselySDK } from 'optimisely-cloud-sdk';

const sdk = new OptimiselySDK();

const configs = [
  {
    provider: 'aws',
    credentials: { aws: { /* AWS credentials */ } }
  },
  {
    provider: 'azure',
    credentials: { azure: { /* Azure credentials */ } }
  },
  {
    provider: 'gcp',
    credentials: { gcp: { /* GCP credentials */ } }
  }
];

const results = await sdk.scanMultipleProviders(configs);

results.forEach(result => {
  console.log(`${result.provider}: ${result.totalResources} resources, $${result.estimatedMonthlyCost.total}/month`);
});
```

### Cost Comparison

```typescript
const comparison = await sdk.compareProviderCosts(configs, ['compute', 'storage']);

console.log('Cost Comparison:');
comparison.providers.forEach(provider => {
  console.log(`${provider.provider}: $${provider.totalCost}/month (${provider.resourceCount} resources)`);
});

console.log(`Recommendation: Use ${comparison.recommendations.cheapest} to save $${comparison.recommendations.savings}/month`);
```

### Optimization Recommendations

```typescript
const recommendations = await sdk.getOptimizationRecommendations(config, 'high');

recommendations.forEach(rec => {
  console.log(`${rec.title}: $${rec.potentialSavings?.monthly}/month savings`);
  console.log(`  ${rec.description}`);
  console.log(`  Recommendation: ${rec.recommendation}`);
});
```

### Export Results

```typescript
const result = await sdk.scanCloud(config);

// Export as JSON
const jsonOutput = sdk.exportResults(result, 'json');

// Export as CSV
const csvOutput = sdk.exportResults(result, 'csv');

// Save to file
import { writeFileSync } from 'fs';
writeFileSync('scan-results.json', jsonOutput);
```

### Generate Terraform Infrastructure as Code

```typescript
import { generateTerraform, TerraformOptions } from 'optimisely-cloud-sdk/terraform';

// Scan your infrastructure
const scanResult = await sdk.scanCloud(config, {
  includeCostAnalysis: true,
  includeOptimizationRecommendations: true
});

// Generate Terraform configuration
const terraformOptions: TerraformOptions = {
  provider: 'aws',
  variables: true,
  outputs: true,
  modules: false,
  optimized: true  // Apply cost optimizations
};

const terraformOutput = await generateTerraform(scanResult, terraformOptions);

// Save Terraform files
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const outputDir = './generated-terraform';
mkdirSync(outputDir, { recursive: true });

writeFileSync(join(outputDir, 'main.tf'), terraformOutput.mainTf);
writeFileSync(join(outputDir, 'provider.tf'), terraformOutput.providerTf);

if (terraformOutput.variablesTf) {
  writeFileSync(join(outputDir, 'variables.tf'), terraformOutput.variablesTf);
}

if (terraformOutput.outputsTf) {
  writeFileSync(join(outputDir, 'outputs.tf'), terraformOutput.outputsTf);
}

if (terraformOutput.terraformTfvars) {
  writeFileSync(join(outputDir, 'terraform.tfvars.example'), terraformOutput.terraformTfvars);
}

console.log('Terraform configuration generated successfully!');
```

## 🔑 Authentication

### AWS
Set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_DEFAULT_REGION=us-east-1
```

Or use AWS credentials file or IAM roles.

### Azure
Set environment variables:
```bash
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-client-secret
export AZURE_TENANT_ID=your-tenant-id
export AZURE_SUBSCRIPTION_ID=your-subscription-id
```

### Google Cloud Platform
Set environment variables:
```bash
export GCP_PROJECT_ID=your-project-id
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## 📊 Sample Output

```json
{
  "provider": "aws",
  "region": "us-east-1",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalResources": 15,
  "resources": {
    "compute": [
      {
        "id": "i-1234567890abcdef0",
        "name": "web-server-prod",
        "type": "compute",
        "provider": "aws",
        "region": "us-east-1",
        "status": "running",
        "instanceType": "t3.medium",
        "vCpus": 2,
        "memory": 4,
        "tags": {
          "Environment": "production",
          "Project": "web-app"
        }
      }
    ],
    "storage": [...],
    "database": [...],
    "network": [...],
    "serverless": [...]
  },
  "estimatedMonthlyCost": {
    "total": 542.30,
    "currency": "USD",
    "breakdown": {
      "compute": 320.40,
      "storage": 125.80,
      "database": 96.10
    }
  },
  "optimizationOpportunities": [
    {
      "id": "oversized-instances",
      "type": "cost",
      "severity": "high",
      "title": "Over-provisioned Instances",
      "description": "Found 3 instances that could be downsized",
      "recommendation": "Consider using smaller instance types",
      "potentialSavings": {
        "monthly": 127.50,
        "annual": 1530.00,
        "currency": "USD"
      },
      "effort": "medium",
      "impact": "high"
    }
  ]
}
```

## 🏷️ Resource Types

The SDK recognizes the following resource types:

- `compute` - Virtual machines, instances
- `storage` - Object storage, block storage, file storage
- `database` - Managed database services
- `network` - VPCs, subnets, load balancers, security groups
- `serverless` - Functions as a Service, serverless compute

## 🎯 Optimization Categories

The SDK provides optimization recommendations in these categories:

- `cost` - Cost reduction opportunities
- `performance` - Performance improvement suggestions
- `security` - Security best practices
- `compliance` - Compliance and governance recommendations

## 🔧 Configuration Options

### Scan Options

```typescript
interface ScanOptions {
  includeTypes?: string[];           // ['compute', 'storage']
  excludeTypes?: string[];           // ['network']
  includeTags?: Record<string, string>;
  excludeTags?: Record<string, string>;
  includeRegions?: string[];         // ['us-east-1', 'us-west-2']
  excludeRegions?: string[];
  includeCostAnalysis?: boolean;
  includeOptimizationRecommendations?: boolean;
  outputFormat?: 'json' | 'yaml' | 'csv' | 'table';
  outputFile?: string;
  verbose?: boolean;
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

Found a bug? Please [open an issue](https://github.com/optimisely-ai/cloud-sdk/issues) with:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node.js version, etc.)

## 📧 Support

For support and questions:

- 📧 Email: support@optimisely.ai
- 🌐 Website: https://optimisely.ai
- 📚 Documentation: https://docs.optimisely.ai/cloud-sdk

## 🚀 Roadmap

### Upcoming Features

- [ ] **Additional Cloud Providers**
  - Oracle Cloud Infrastructure (OCI)
  - IBM Cloud
  - DigitalOcean

- [ ] **Enhanced Analytics**
  - Historical cost tracking
  - Trend analysis
  - Predictive scaling recommendations

- [ ] **Automation Features**
  - Auto-scaling recommendations
  - Automated resource cleanup
  - Cost budget alerts

- [ ] **Integration Capabilities**
  - CI/CD pipeline integration
  - Slack/Teams notifications
  - Grafana/Prometheus metrics

- [ ] **Advanced Optimization**
  - Reserved instance recommendations
  - Spot instance analysis
  - Multi-cloud cost arbitrage

## 📈 Performance

The SDK is optimized for performance:

- **Concurrent Scanning**: Parallel resource discovery across regions
- **Efficient API Usage**: Minimized API calls through intelligent batching
- **Memory Optimization**: Streaming results for large-scale environments
- **Rate Limiting**: Automatic handling of provider API limits

## 🔒 Security

Security is our top priority:

- **Credential Security**: Credentials are never logged or stored
- **Minimal Permissions**: Uses least-privilege access patterns
- **Secure Defaults**: All connections use TLS/SSL encryption
- **Audit Trail**: Comprehensive logging for security auditing

---

Built with ❤️ by the Optimisely.ai Team