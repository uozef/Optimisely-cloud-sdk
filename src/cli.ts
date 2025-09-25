#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { writeFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { OptimiselySDK } from './index';
import { CloudConnectorConfig, ScanOptions } from './types';
import { createLogger, format, transports } from 'winston';

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