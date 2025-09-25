#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { writeFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { OptimiselySDK } from './index';
import { CloudConnectorConfig, ScanOptions } from './types';
import { generateTerraform, TerraformOptions } from './terraform';
import { createLogger, format, transports } from 'winston';
import { mkdirSync, existsSync } from 'fs';
import * as path from 'path';

dotenv.config();

// Setup logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

const program = new Command();

program
  .name('optimisely')
  .description('Optimisely Cloud SDK - Extract and analyze cloud infrastructure components')
  .version('1.0.0');

// Scan command
program
  .command('scan')
  .description('Scan cloud infrastructure and extract active components')
  .option('-p, --provider <provider>', 'Cloud provider (aws, azure, gcp)', 'aws')
  .option('-r, --region <region>', 'Cloud region')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <format>', 'Output format (json, yaml, csv, table)', 'json')
  .option('--include-types <types>', 'Include specific resource types (comma-separated)')
  .option('--exclude-types <types>', 'Exclude specific resource types (comma-separated)')
  .option('--include-regions <regions>', 'Include specific regions (comma-separated)')
  .option('--exclude-regions <regions>', 'Exclude specific regions (comma-separated)')
  .option('--include-cost-analysis', 'Include cost analysis in results', false)
  .option('--include-optimization', 'Include optimization recommendations', false)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      await handleScanCommand(options);
    } catch (error) {
      logger.error('Scan failed:', error);
      console.error(chalk.red('❌ Scan failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Configure command
program
  .command('configure')
  .description('Configure cloud provider credentials')
  .option('-p, --provider <provider>', 'Cloud provider to configure (aws, azure, gcp)')
  .action(async (options) => {
    try {
      await handleConfigureCommand(options);
    } catch (error) {
      logger.error('Configuration failed:', error);
      console.error(chalk.red('❌ Configuration failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List providers command
program
  .command('providers')
  .description('List supported cloud providers and regions')
  .action(() => {
    console.log(chalk.blue('\n📋 Supported Cloud Providers:\n'));

    console.log(chalk.yellow('AWS (Amazon Web Services)'));
    console.log('  • Supported services: EC2, S3, RDS, Lambda, VPC, Security Groups');
    console.log('  • Popular regions: us-east-1, us-west-2, eu-west-1, ap-southeast-1\n');

    console.log(chalk.yellow('Azure (Microsoft Azure)'));
    console.log('  • Supported services: Virtual Machines, Storage Accounts, VNets');
    console.log('  • Popular regions: eastus, westus2, westeurope, southeastasia\n');

    console.log(chalk.yellow('GCP (Google Cloud Platform)'));
    console.log('  • Supported services: Compute Engine, Cloud Storage, VPC Networks');
    console.log('  • Popular regions: us-central1, us-east1, europe-west1, asia-southeast1\n');
  });

// Cost analysis command
program
  .command('cost')
  .description('Analyze cloud costs and generate cost optimization report')
  .option('-p, --provider <provider>', 'Cloud provider (aws, azure, gcp)', 'aws')
  .option('-r, --region <region>', 'Cloud region')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <format>', 'Output format (json, yaml, csv)', 'json')
  .action(async (options) => {
    try {
      await handleCostCommand(options);
    } catch (error) {
      logger.error('Cost analysis failed:', error);
      console.error(chalk.red('❌ Cost analysis failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Optimize command
program
  .command('optimize')
  .description('Generate optimization recommendations for your cloud resources')
  .option('-p, --provider <provider>', 'Cloud provider (aws, azure, gcp)', 'aws')
  .option('-r, --region <region>', 'Cloud region')
  .option('-s, --severity <level>', 'Minimum severity level (low, medium, high, critical)', 'medium')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      await handleOptimizeCommand(options);
    } catch (error) {
      logger.error('Optimization failed:', error);
      console.error(chalk.red('❌ Optimization failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Terraform generation command
program
  .command('terraform')
  .description('Generate Terraform configuration from scanned cloud infrastructure')
  .option('-p, --provider <provider>', 'Cloud provider (aws, azure, gcp)', 'aws')
  .option('-r, --region <region>', 'Cloud region')
  .option('-i, --input <file>', 'Input scan results file (JSON format)')
  .option('-o, --output <dir>', 'Output directory for Terraform files', './terraform')
  .option('--variables', 'Generate variables.tf file', false)
  .option('--outputs', 'Generate outputs.tf file', false)
  .option('--modules', 'Generate modular Terraform structure', false)
  .option('--optimized', 'Apply cost optimizations to generated resources', false)
  .option('--rescan', 'Perform new scan before generating Terraform', false)
  .action(async (options) => {
    try {
      await handleTerraformCommand(options);
    } catch (error) {
      logger.error('Terraform generation failed:', error);
      console.error(chalk.red('❌ Terraform generation failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function handleScanCommand(options: any) {
  const spinner = ora('Initializing scan...').start();

  try {
    // Get configuration
    const config = await getCloudConfig(options.provider, options.region, options.config);

    spinner.text = `Scanning ${options.provider.toUpperCase()} resources...`;

    // Initialize SDK
    const sdk = new OptimiselySDK();

    // Prepare scan options
    const scanOptions: ScanOptions = {
      includeTypes: options.includeTypes ? options.includeTypes.split(',') : undefined,
      excludeTypes: options.excludeTypes ? options.excludeTypes.split(',') : undefined,
      includeRegions: options.includeRegions ? options.includeRegions.split(',') : undefined,
      excludeRegions: options.excludeRegions ? options.excludeRegions.split(',') : undefined,
      includeCostAnalysis: options.includeCostAnalysis,
      includeOptimizationRecommendations: options.includeOptimization,
      outputFormat: options.format,
      outputFile: options.output,
      verbose: options.verbose
    };

    // Perform scan
    const result = await sdk.scanCloud(config, scanOptions);

    spinner.succeed(`Scan completed! Found ${result.totalResources} resources`);

    // Display summary
    console.log(chalk.blue('\n📊 Scan Results Summary:'));
    console.log(chalk.green(`  • Provider: ${result.provider.toUpperCase()}`));
    console.log(chalk.green(`  • Region: ${result.region}`));
    console.log(chalk.green(`  • Total Resources: ${result.totalResources}`));
    console.log(chalk.green(`  • Compute: ${result.resources.compute.length}`));
    console.log(chalk.green(`  • Storage: ${result.resources.storage.length}`));
    console.log(chalk.green(`  • Database: ${result.resources.database.length}`));
    console.log(chalk.green(`  • Network: ${result.resources.network.length}`));
    console.log(chalk.green(`  • Serverless: ${result.resources.serverless.length}`));

    if (result.estimatedMonthlyCost.total > 0) {
      console.log(chalk.yellow(`  • Estimated Monthly Cost: $${result.estimatedMonthlyCost.total}`));
    }

    if (result.optimizationOpportunities.length > 0) {
      console.log(chalk.red(`  • Optimization Opportunities: ${result.optimizationOpportunities.length}`));

      const totalSavings = result.optimizationOpportunities.reduce(
        (sum, opp) => sum + (opp.potentialSavings?.monthly || 0), 0
      );
      if (totalSavings > 0) {
        console.log(chalk.red(`  • Potential Monthly Savings: $${totalSavings}`));
      }
    }

    // Save to file
    if (options.output) {
      saveResults(result, options.output, options.format);
      console.log(chalk.blue(`\n💾 Results saved to: ${options.output}`));
    } else if (options.format === 'table') {
      displayTable(result);
    } else {
      console.log('\n' + JSON.stringify(result, null, 2));
    }

  } catch (error) {
    spinner.fail('Scan failed');
    throw error;
  }
}

async function handleConfigureCommand(options: any) {
  console.log(chalk.blue('🔧 Configuring cloud provider credentials...\n'));

  const provider = options.provider || await inquirer.prompt([{
    type: 'list',
    name: 'provider',
    message: 'Select cloud provider:',
    choices: ['aws', 'azure', 'gcp']
  }]).then(answers => answers.provider);

  let envContent = '';

  switch (provider) {
    case 'aws':
      const awsAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'accessKeyId',
          message: 'AWS Access Key ID:'
        },
        {
          type: 'password',
          name: 'secretAccessKey',
          message: 'AWS Secret Access Key:'
        },
        {
          type: 'input',
          name: 'region',
          message: 'Default AWS Region:',
          default: 'us-east-1'
        }
      ]);

      envContent = `AWS_ACCESS_KEY_ID=${awsAnswers.accessKeyId}
AWS_SECRET_ACCESS_KEY=${awsAnswers.secretAccessKey}
AWS_DEFAULT_REGION=${awsAnswers.region}
`;
      break;

    case 'azure':
      const azureAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'clientId',
          message: 'Azure Client ID:'
        },
        {
          type: 'password',
          name: 'clientSecret',
          message: 'Azure Client Secret:'
        },
        {
          type: 'input',
          name: 'tenantId',
          message: 'Azure Tenant ID:'
        },
        {
          type: 'input',
          name: 'subscriptionId',
          message: 'Azure Subscription ID:'
        }
      ]);

      envContent = `AZURE_CLIENT_ID=${azureAnswers.clientId}
AZURE_CLIENT_SECRET=${azureAnswers.clientSecret}
AZURE_TENANT_ID=${azureAnswers.tenantId}
AZURE_SUBSCRIPTION_ID=${azureAnswers.subscriptionId}
`;
      break;

    case 'gcp':
      const gcpAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectId',
          message: 'GCP Project ID:'
        },
        {
          type: 'input',
          name: 'keyFile',
          message: 'Path to GCP Service Account Key File:'
        }
      ]);

      envContent = `GCP_PROJECT_ID=${gcpAnswers.projectId}
GOOGLE_APPLICATION_CREDENTIALS=${gcpAnswers.keyFile}
`;
      break;
  }

  // Save to .env file
  try {
    writeFileSync('.env', envContent);
    console.log(chalk.green('✅ Configuration saved to .env file'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not save to .env file. Please set environment variables manually:'));
    console.log(envContent);
  }
}

async function handleCostCommand(options: any) {
  const spinner = ora('Analyzing costs...').start();

  try {
    const config = await getCloudConfig(options.provider, options.region);
    const sdk = new OptimiselySDK();

    const result = await sdk.scanCloud(config, {
      includeCostAnalysis: true,
      outputFormat: options.format
    });

    spinner.succeed('Cost analysis completed');

    console.log(chalk.blue('\n💰 Cost Analysis:'));
    console.log(chalk.green(`  Total Monthly Cost: $${result.estimatedMonthlyCost.total}`));

    Object.entries(result.estimatedMonthlyCost.breakdown).forEach(([service, cost]) => {
      console.log(chalk.white(`    ${service}: $${cost}`));
    });

    if (options.output) {
      saveResults(result.estimatedMonthlyCost, options.output, options.format);
      console.log(chalk.blue(`\n💾 Cost analysis saved to: ${options.output}`));
    }

  } catch (error) {
    spinner.fail('Cost analysis failed');
    throw error;
  }
}

async function handleOptimizeCommand(options: any) {
  const spinner = ora('Generating optimization recommendations...').start();

  try {
    const config = await getCloudConfig(options.provider, options.region);
    const sdk = new OptimiselySDK();

    const result = await sdk.scanCloud(config, {
      includeOptimizationRecommendations: true
    });

    spinner.succeed('Optimization analysis completed');

    const filteredOpportunities = result.optimizationOpportunities.filter(opp => {
      const severityLevels = ['low', 'medium', 'high', 'critical'];
      const minLevel = severityLevels.indexOf(options.severity);
      const oppLevel = severityLevels.indexOf(opp.severity);
      return oppLevel >= minLevel;
    });

    console.log(chalk.blue(`\n🚀 Optimization Recommendations (${filteredOpportunities.length}):`));

    filteredOpportunities.forEach((opp, index) => {
      const severityColor = {
        low: chalk.blue,
        medium: chalk.yellow,
        high: chalk.red,
        critical: chalk.redBright
      }[opp.severity];

      console.log(`\n${index + 1}. ${severityColor(opp.title)} [${severityColor(opp.severity.toUpperCase())}]`);
      console.log(`   ${opp.description}`);
      console.log(`   💡 ${opp.recommendation}`);

      if (opp.potentialSavings) {
        console.log(`   💰 Potential savings: $${opp.potentialSavings.monthly}/month`);
      }

      console.log(`   🔧 Effort: ${opp.effort} | 📈 Impact: ${opp.impact}`);
      console.log(`   📋 Resources: ${opp.resourceIds.length} affected`);
    });

    if (options.output) {
      saveResults(filteredOpportunities, options.output, 'json');
      console.log(chalk.blue(`\n💾 Recommendations saved to: ${options.output}`));
    }

  } catch (error) {
    spinner.fail('Optimization analysis failed');
    throw error;
  }
}

async function handleTerraformCommand(options: any) {
  const spinner = ora('Initializing Terraform generation...').start();

  try {
    let scanResult;

    // Check if we should use existing scan results or perform a new scan
    if (options.input && existsSync(options.input)) {
      spinner.text = 'Loading scan results...';
      const inputData = require(path.resolve(options.input));
      scanResult = inputData;
      spinner.succeed(`Loaded scan results from ${options.input}`);
    } else if (options.rescan || !options.input) {
      // Perform new scan
      spinner.text = `Scanning ${options.provider.toUpperCase()} infrastructure...`;

      const config = await getCloudConfig(options.provider, options.region);
      const sdk = new OptimiselySDK();

      scanResult = await sdk.scanCloud(config, {
        includeCostAnalysis: true,
        includeOptimizationRecommendations: options.optimized
      });

      spinner.succeed(`Scan completed! Found ${scanResult.totalResources} resources`);
    } else {
      throw new Error(`Input file ${options.input} not found. Use --rescan to perform a new scan.`);
    }

    // Generate Terraform configuration
    spinner.start('Generating Terraform configuration...');

    const terraformOptions: TerraformOptions = {
      provider: options.provider,
      outputDir: options.output,
      variables: options.variables,
      outputs: options.outputs,
      modules: options.modules,
      optimized: options.optimized
    };

    const terraformOutput = await generateTerraform(scanResult, terraformOptions);

    // Create output directory if it doesn't exist
    if (!existsSync(options.output)) {
      mkdirSync(options.output, { recursive: true });
    }

    // Write Terraform files
    const outputDir = path.resolve(options.output);

    // Main configuration file
    writeFileSync(path.join(outputDir, 'main.tf'), terraformOutput.mainTf);

    // Provider configuration
    writeFileSync(path.join(outputDir, 'provider.tf'), terraformOutput.providerTf);

    // Variables file (if requested)
    if (terraformOutput.variablesTf) {
      writeFileSync(path.join(outputDir, 'variables.tf'), terraformOutput.variablesTf);
    }

    // Outputs file (if requested)
    if (terraformOutput.outputsTf) {
      writeFileSync(path.join(outputDir, 'outputs.tf'), terraformOutput.outputsTf);
    }

    // Terraform variables file
    if (terraformOutput.terraformTfvars) {
      writeFileSync(path.join(outputDir, 'terraform.tfvars.example'), terraformOutput.terraformTfvars);
    }

    // Modules (if requested)
    if (terraformOutput.modules && options.modules) {
      const modulesDir = path.join(outputDir, 'modules');
      if (!existsSync(modulesDir)) {
        mkdirSync(modulesDir, { recursive: true });
      }

      Object.entries(terraformOutput.modules).forEach(([moduleName, moduleContent]) => {
        const moduleDir = path.join(modulesDir, moduleName);
        if (!existsSync(moduleDir)) {
          mkdirSync(moduleDir, { recursive: true });
        }
        writeFileSync(path.join(moduleDir, 'main.tf'), moduleContent);
      });
    }

    // Create startup scripts directory with example files
    const scriptsDir = path.join(outputDir, 'startup-scripts');
    if (!existsSync(scriptsDir)) {
      mkdirSync(scriptsDir, { recursive: true });
    }

    // Create example startup script
    const exampleStartupScript = `#!/bin/bash

# Optimisely Infrastructure Startup Script
# This script runs when the instance starts

# Update system packages
apt-get update -y
apt-get upgrade -y

# Install basic tools
apt-get install -y curl wget git htop

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Node.js (optional)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Set up application user
useradd -m -s /bin/bash appuser

# Log completion
echo "$(date): Startup script completed" >> /var/log/startup.log
`;

    // Write example startup scripts for each instance
    if (scanResult.resources.compute.length > 0) {
      scanResult.resources.compute.forEach((instance: any, index: number) => {
        const resourceName = sanitizeResourceName(instance.name || `instance_${index}`);
        writeFileSync(path.join(scriptsDir, `${resourceName}.sh`), exampleStartupScript);
      });
    } else {
      writeFileSync(path.join(scriptsDir, 'example.sh'), exampleStartupScript);
    }

    // Create README with instructions
    const readmeContent = generateTerraformReadme(scanResult, terraformOptions, outputDir);
    writeFileSync(path.join(outputDir, 'README.md'), readmeContent);

    spinner.succeed('Terraform configuration generated successfully!');

    // Display summary
    console.log(chalk.blue('\n🏗️  Terraform Generation Summary:'));
    console.log(chalk.green(`  • Provider: ${options.provider.toUpperCase()}`));
    console.log(chalk.green(`  • Resources: ${scanResult.totalResources}`));
    console.log(chalk.green(`  • Output Directory: ${outputDir}`));
    console.log(chalk.green('  • Files Generated:'));
    console.log(chalk.white('    - main.tf (main configuration)'));
    console.log(chalk.white('    - provider.tf (provider configuration)'));

    if (terraformOutput.variablesTf) {
      console.log(chalk.white('    - variables.tf (input variables)'));
    }

    if (terraformOutput.outputsTf) {
      console.log(chalk.white('    - outputs.tf (output values)'));
    }

    console.log(chalk.white('    - terraform.tfvars.example (example variables)'));
    console.log(chalk.white('    - startup-scripts/ (instance startup scripts)'));
    console.log(chalk.white('    - README.md (deployment instructions)'));

    if (options.modules && terraformOutput.modules) {
      console.log(chalk.white('    - modules/ (modular structure)'));
    }

    console.log(chalk.yellow('\n📋 Next Steps:'));
    console.log(chalk.white(`  1. cd ${outputDir}`));
    console.log(chalk.white('  2. Copy terraform.tfvars.example to terraform.tfvars'));
    console.log(chalk.white('  3. Edit terraform.tfvars with your values'));
    console.log(chalk.white('  4. Run: terraform init'));
    console.log(chalk.white('  5. Run: terraform plan'));
    console.log(chalk.white('  6. Run: terraform apply'));

    if (scanResult.estimatedMonthlyCost?.total > 0) {
      console.log(chalk.yellow(`\n💰 Estimated Monthly Cost: $${scanResult.estimatedMonthlyCost.total}`));
    }

    if (options.optimized && scanResult.optimizationOpportunities?.length > 0) {
      const totalSavings = scanResult.optimizationOpportunities.reduce(
        (sum: number, opp: any) => sum + (opp.potentialSavings?.monthly || 0), 0
      );
      if (totalSavings > 0) {
        console.log(chalk.green(`💡 Applied optimizations with potential savings: $${totalSavings}/month`));
      }
    }

  } catch (error) {
    spinner.fail('Terraform generation failed');
    throw error;
  }
}

function generateTerraformReadme(scanResult: any, options: TerraformOptions, outputDir: string): string {
  return `# Terraform Infrastructure Configuration

Generated by Optimisely Cloud SDK on ${new Date().toISOString()}

## Overview

This Terraform configuration recreates your ${options.provider.toUpperCase()} infrastructure based on the scan performed on ${scanResult.timestamp}.

### Infrastructure Summary
- **Provider**: ${options.provider.toUpperCase()}
- **Region**: ${scanResult.region}
- **Total Resources**: ${scanResult.totalResources}
- **Compute Instances**: ${scanResult.resources.compute.length}
- **Storage Resources**: ${scanResult.resources.storage.length}
- **Database Resources**: ${scanResult.resources.database.length}
- **Network Resources**: ${scanResult.resources.network.length}
- **Serverless Resources**: ${scanResult.resources.serverless.length}

${scanResult.estimatedMonthlyCost?.total > 0 ? `### Estimated Monthly Cost
$${scanResult.estimatedMonthlyCost.total}

#### Cost Breakdown
${Object.entries(scanResult.estimatedMonthlyCost.breakdown).map(([service, cost]) =>
  `- ${service}: $${cost}`
).join('\n')}
` : ''}

## Prerequisites

1. **Terraform**: Install Terraform >= 1.0
   \`\`\`bash
   # macOS
   brew install terraform

   # Ubuntu/Debian
   wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   \`\`\`

2. **Cloud Provider CLI**: Install and configure the appropriate CLI
${options.provider === 'aws' ? `   \`\`\`bash
   # AWS CLI
   aws configure
   \`\`\`` : options.provider === 'azure' ? `   \`\`\`bash
   # Azure CLI
   az login
   \`\`\`` : `   \`\`\`bash
   # Google Cloud CLI
   gcloud auth application-default login
   \`\`\``}

## Quick Start

1. **Configure Variables**
   \`\`\`bash
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your specific values
   \`\`\`

2. **Initialize Terraform**
   \`\`\`bash
   terraform init
   \`\`\`

3. **Review the Plan**
   \`\`\`bash
   terraform plan
   \`\`\`

4. **Deploy Infrastructure**
   \`\`\`bash
   terraform apply
   \`\`\`

## Important Configuration

### Required Variables

Edit \`terraform.tfvars\` and set these required variables:

${options.provider === 'aws' ? `- \`key_name\`: Your EC2 key pair name for SSH access
- \`allowed_ssh_cidr\`: CIDR block allowed for SSH access (recommend restricting from 0.0.0.0/0)` :
options.provider === 'azure' ? `- \`admin_password\`: Secure password for VM admin user
- \`ssh_public_key_path\`: Path to your SSH public key file
- \`allowed_ssh_cidr\`: CIDR block allowed for SSH access (recommend restricting from 0.0.0.0/0)` :
`- \`project_id\`: Your GCP project ID
- \`ssh_public_keys\`: List of SSH public keys for instance access`}

### Security Considerations

1. **SSH Access**: By default, SSH access is open to 0.0.0.0/0. Restrict this to your IP range.
2. **Passwords**: Use strong passwords and consider using secrets management.
3. **Encryption**: All resources are configured with encryption at rest where possible.
4. **Network Security**: Review firewall rules and security groups before deployment.

## File Structure

\`\`\`
${path.basename(outputDir)}/
├── main.tf                    # Main infrastructure configuration
├── provider.tf               # Provider configuration
${options.variables ? '├── variables.tf              # Input variables\n' : ''}${options.outputs ? '├── outputs.tf                # Output values\n' : ''}├── terraform.tfvars.example  # Example variable values
├── startup-scripts/          # Instance startup scripts
${options.modules ? '├── modules/                   # Terraform modules\n' : ''}└── README.md                 # This file
\`\`\`

## Customization

### Startup Scripts

Edit files in \`startup-scripts/\` to customize what happens when instances start. These scripts will:
- Update system packages
- Install basic tools
- Set up application environment

### Resource Modifications

You can modify the generated Terraform configuration to:
- Change instance types/sizes
- Modify network configuration
- Add additional resources
- Customize security groups/firewalls

## Monitoring and Management

After deployment, consider:
1. Setting up monitoring and logging
2. Implementing backup strategies
3. Configuring auto-scaling (if needed)
4. Setting up CI/CD pipelines

## Support

For issues with this generated configuration:
- 📧 Email: support@optimisely.ai
- 🌐 Website: https://optimisely.ai
- 📚 Documentation: https://docs.optimisely.ai

## Generated Resources

${scanResult.resources.compute.length > 0 ? `### Compute Resources (${scanResult.resources.compute.length})
${scanResult.resources.compute.map((resource: any, index: number) =>
  `- ${resource.name || `Instance ${index + 1}`} (${resource.instanceType || 'N/A'})`
).join('\n')}
` : ''}

${scanResult.resources.storage.length > 0 ? `### Storage Resources (${scanResult.resources.storage.length})
${scanResult.resources.storage.map((resource: any, index: number) =>
  `- ${resource.name || `Storage ${index + 1}`} (${resource.storageType || 'N/A'})`
).join('\n')}
` : ''}

${scanResult.resources.database.length > 0 ? `### Database Resources (${scanResult.resources.database.length})
${scanResult.resources.database.map((resource: any, index: number) =>
  `- ${resource.name || `Database ${index + 1}`} (${resource.engine || 'N/A'})`
).join('\n')}
` : ''}

---

*Generated by Optimisely Cloud SDK v1.0.0*
`;
}

function sanitizeResourceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '_')
    .replace(/^[0-9]/, 'r$&')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63);
}

async function getCloudConfig(provider: string, region?: string, configFile?: string): Promise<CloudConnectorConfig> {
  // Load from config file if provided
  if (configFile) {
    const config = require(configFile);
    return config;
  }

  // Load from environment variables
  const config: CloudConnectorConfig = {
    provider: provider as 'aws' | 'azure' | 'gcp',
    credentials: {}
  };

  switch (provider) {
    case 'aws':
      config.credentials.aws = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        region: region || process.env.AWS_DEFAULT_REGION || 'us-east-1',
        sessionToken: process.env.AWS_SESSION_TOKEN
      };
      break;

    case 'azure':
      config.credentials.azure = {
        clientId: process.env.AZURE_CLIENT_ID || '',
        clientSecret: process.env.AZURE_CLIENT_SECRET || '',
        tenantId: process.env.AZURE_TENANT_ID || '',
        subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || ''
      };
      break;

    case 'gcp':
      config.credentials.gcp = {
        projectId: process.env.GCP_PROJECT_ID || '',
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || ''
      };
      break;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  return config;
}

function saveResults(data: any, outputFile: string, format: string) {
  let content: string;

  switch (format) {
    case 'yaml':
      // For simplicity, using JSON format. In production, add yaml library
      content = JSON.stringify(data, null, 2);
      break;
    case 'csv':
      // For simplicity, using JSON format. In production, convert to CSV
      content = JSON.stringify(data, null, 2);
      break;
    default:
      content = JSON.stringify(data, null, 2);
  }

  writeFileSync(outputFile, content);
}

function displayTable(result: any) {
  console.log(chalk.blue('\n📋 Resources Table:'));

  // Display compute resources
  if (result.resources.compute.length > 0) {
    console.log(chalk.yellow('\nCompute Resources:'));
    result.resources.compute.forEach((resource: any, index: number) => {
      console.log(`${index + 1}. ${resource.name} (${resource.instanceType}) - ${resource.status}`);
    });
  }

  // Display storage resources
  if (result.resources.storage.length > 0) {
    console.log(chalk.yellow('\nStorage Resources:'));
    result.resources.storage.forEach((resource: any, index: number) => {
      console.log(`${index + 1}. ${resource.name} (${resource.storageType}) - ${resource.status}`);
    });
  }

  // Display database resources
  if (result.resources.database.length > 0) {
    console.log(chalk.yellow('\nDatabase Resources:'));
    result.resources.database.forEach((resource: any, index: number) => {
      console.log(`${index + 1}. ${resource.name} (${resource.engine}) - ${resource.status}`);
    });
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  console.error(chalk.red('❌ Unexpected error occurred:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', reason);
  console.error(chalk.red('❌ Unhandled promise rejection:'), reason);
  process.exit(1);
});

program.parse();