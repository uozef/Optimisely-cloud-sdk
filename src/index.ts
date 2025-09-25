export * from './types';
export { AWSConnector } from './connectors/aws';
export { AzureConnector } from './connectors/azure';
export { GCPConnector } from './connectors/gcp';

import { AWSConnector } from './connectors/aws';
import { AzureConnector } from './connectors/azure';
import { GCPConnector } from './connectors/gcp';
import {
  CloudConnectorConfig,
  ScanResult,
  ScanOptions,
  OptimizationOpportunity,
  CloudResource
} from './types';

/**
 * Optimisely Cloud SDK
 *
 * Main SDK class for scanning and analyzing cloud infrastructure across
 * AWS, Azure, and Google Cloud Platform.
 *
 * @example
 * ```typescript
 * import { OptimiselySDK } from '@optimisely/cloud-sdk';
 *
 * const sdk = new OptimiselySDK();
 *
 * const config = {
 *   provider: 'aws',
 *   credentials: {
 *     aws: {
 *       accessKeyId: 'your-access-key',
 *       secretAccessKey: 'your-secret-key',
 *       region: 'us-east-1'
 *     }
 *   }
 * };
 *
 * const result = await sdk.scanCloud(config, {
 *   includeCostAnalysis: true,
 *   includeOptimizationRecommendations: true
 * });
 *
 * console.log(`Found ${result.totalResources} resources`);
 * console.log(`Estimated monthly cost: $${result.estimatedMonthlyCost.total}`);
 * ```
 */
export class OptimiselySDK {
  private version = '1.0.0';

  /**
   * Get SDK version
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Scan cloud infrastructure and return detailed resource analysis
   *
   * @param config - Cloud provider configuration
   * @param options - Scan options to customize the analysis
   * @returns Promise containing scan results
   *
   * @throws Error if provider is not supported or credentials are invalid
   */
  async scanCloud(config: CloudConnectorConfig, options: ScanOptions = {}): Promise<ScanResult> {
    this.validateConfig(config);

    const connector = this.createConnector(config);

    try {
      const result = await connector.scanResources(options);

      // Add SDK metadata
      (result as any).sdk = {
        version: this.version,
        scanTime: new Date(),
        options: options
      };

      return result;
    } catch (error) {
      throw new Error(
        `Failed to scan ${config.provider} resources: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Scan multiple cloud providers simultaneously
   *
   * @param configs - Array of cloud provider configurations
   * @param options - Scan options applied to all providers
   * @returns Promise containing array of scan results
   */
  async scanMultipleProviders(
    configs: CloudConnectorConfig[],
    options: ScanOptions = {}
  ): Promise<ScanResult[]> {
    const promises = configs.map(config => this.scanCloud(config, options));

    try {
      return await Promise.all(promises);
    } catch (error) {
      throw new Error(
        `Multi-provider scan failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get cost analysis for specific resource types
   *
   * @param config - Cloud provider configuration
   * @param resourceTypes - Array of resource types to analyze
   * @returns Promise containing cost breakdown
   */
  async getCostAnalysis(
    config: CloudConnectorConfig,
    resourceTypes?: string[]
  ): Promise<{
    total: number;
    currency: string;
    breakdown: Record<string, number>;
    resources: CloudResource[];
  }> {
    const scanOptions: ScanOptions = {
      includeCostAnalysis: true,
      includeTypes: resourceTypes
    };

    const result = await this.scanCloud(config, scanOptions);

    return {
      total: result.estimatedMonthlyCost.total,
      currency: result.estimatedMonthlyCost.currency,
      breakdown: result.estimatedMonthlyCost.breakdown,
      resources: [
        ...result.resources.compute,
        ...result.resources.storage,
        ...result.resources.database,
        ...result.resources.network,
        ...result.resources.serverless
      ]
    };
  }

  /**
   * Get optimization recommendations
   *
   * @param config - Cloud provider configuration
   * @param severity - Minimum severity level to include
   * @returns Promise containing optimization opportunities
   */
  async getOptimizationRecommendations(
    config: CloudConnectorConfig,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<OptimizationOpportunity[]> {
    const result = await this.scanCloud(config, {
      includeOptimizationRecommendations: true
    });

    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const minLevel = severityLevels.indexOf(severity);

    return result.optimizationOpportunities.filter(opp => {
      const oppLevel = severityLevels.indexOf(opp.severity);
      return oppLevel >= minLevel;
    });
  }

  /**
   * Compare costs across multiple cloud providers
   *
   * @param configs - Array of cloud provider configurations
   * @param resourceTypes - Array of resource types to compare
   * @returns Promise containing cost comparison
   */
  async compareProviderCosts(
    configs: CloudConnectorConfig[],
    resourceTypes?: string[]
  ): Promise<{
    providers: Array<{
      provider: string;
      totalCost: number;
      breakdown: Record<string, number>;
      resourceCount: number;
    }>;
    recommendations: {
      cheapest: string;
      savings: number;
      migrationComplexity: 'low' | 'medium' | 'high';
    };
  }> {
    const results = await this.scanMultipleProviders(configs, {
      includeCostAnalysis: true,
      includeTypes: resourceTypes
    });

    const providers = results.map(result => ({
      provider: result.provider,
      totalCost: result.estimatedMonthlyCost.total,
      breakdown: result.estimatedMonthlyCost.breakdown,
      resourceCount: result.totalResources
    }));

    // Find cheapest provider
    const cheapest = providers.reduce((prev, current) =>
      prev.totalCost < current.totalCost ? prev : current
    );

    const mostExpensive = providers.reduce((prev, current) =>
      prev.totalCost > current.totalCost ? prev : current
    );

    const savings = mostExpensive.totalCost - cheapest.totalCost;

    return {
      providers,
      recommendations: {
        cheapest: cheapest.provider,
        savings,
        migrationComplexity: this.estimateMigrationComplexity(providers)
      }
    };
  }

  /**
   * Export scan results in various formats
   *
   * @param result - Scan result to export
   * @param format - Export format
   * @returns Formatted string
   */
  exportResults(result: ScanResult, format: 'json' | 'yaml' | 'csv' | 'xml' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);

      case 'yaml':
        // For production, use a proper YAML library like 'js-yaml'
        return JSON.stringify(result, null, 2);

      case 'csv':
        // For production, implement proper CSV conversion
        const resources = [
          ...result.resources.compute,
          ...result.resources.storage,
          ...result.resources.database,
          ...result.resources.network,
          ...result.resources.serverless
        ];

        let csv = 'ID,Name,Type,Provider,Region,Status\n';
        resources.forEach(resource => {
          csv += `"${resource.id}","${resource.name}","${resource.type}","${resource.provider}","${resource.region}","${resource.status}"\n`;
        });
        return csv;

      case 'xml':
        // For production, implement proper XML conversion
        return `<?xml version="1.0"?>\n<scan>\n  ${JSON.stringify(result, null, 2)}\n</scan>`;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Validate provider configuration
   */
  private validateConfig(config: CloudConnectorConfig): void {
    if (!config.provider) {
      throw new Error('Provider is required');
    }

    if (!['aws', 'azure', 'gcp'].includes(config.provider)) {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }

    if (!config.credentials) {
      throw new Error('Credentials are required');
    }

    const providerCreds = config.credentials[config.provider];
    if (!providerCreds) {
      throw new Error(`Credentials for ${config.provider} are required`);
    }

    // Provider-specific validation
    switch (config.provider) {
      case 'aws':
        const awsCreds = providerCreds as any;
        if (!awsCreds.accessKeyId || !awsCreds.secretAccessKey || !awsCreds.region) {
          throw new Error('AWS credentials must include accessKeyId, secretAccessKey, and region');
        }
        break;

      case 'azure':
        const azureCreds = providerCreds as any;
        if (!azureCreds.clientId || !azureCreds.clientSecret ||
            !azureCreds.tenantId || !azureCreds.subscriptionId) {
          throw new Error('Azure credentials must include clientId, clientSecret, tenantId, and subscriptionId');
        }
        break;

      case 'gcp':
        const gcpCreds = providerCreds as any;
        if (!gcpCreds.projectId) {
          throw new Error('GCP credentials must include projectId');
        }
        break;
    }
  }

  /**
   * Create appropriate connector based on provider
   */
  private createConnector(config: CloudConnectorConfig): AWSConnector | AzureConnector | GCPConnector {
    switch (config.provider) {
      case 'aws':
        const awsCreds = config.credentials.aws!;
        return new AWSConnector(awsCreds.region, {
          accessKeyId: awsCreds.accessKeyId,
          secretAccessKey: awsCreds.secretAccessKey,
          sessionToken: awsCreds.sessionToken
        });

      case 'azure':
        const azureCreds = config.credentials.azure!;
        return new AzureConnector(azureCreds.subscriptionId, 'eastus', azureCreds);

      case 'gcp':
        const gcpCreds = config.credentials.gcp!;
        return new GCPConnector(gcpCreds.projectId, 'us-central1-a', gcpCreds.credentials);

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Estimate migration complexity between providers
   */
  private estimateMigrationComplexity(providers: Array<{ provider: string; resourceCount: number }>): 'low' | 'medium' | 'high' {
    const maxResources = Math.max(...providers.map(p => p.resourceCount));

    if (maxResources < 10) return 'low';
    if (maxResources < 50) return 'medium';
    return 'high';
  }
}

// Export singleton instance for convenience
export const optimiselySDK = new OptimiselySDK();

// Default export
export default OptimiselySDK;