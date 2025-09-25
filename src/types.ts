/**
 * Type definitions for Optimisely Cloud SDK
 */

export type CloudProvider = 'aws' | 'azure' | 'gcp';
export type ResourceType = 'compute' | 'storage' | 'database' | 'network' | 'serverless';

// Legacy type aliases for backward compatibility
export type ComputeResource = CloudResource;
export type StorageResource = CloudResource;
export type DatabaseResource = CloudResource;
export type NetworkResource = CloudResource;
export type ServerlessResource = CloudResource;
export type OptimizationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CloudCredentials {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
  };
  azure?: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    subscriptionId: string;
  };
  gcp?: {
    projectId: string;
    keyFilename?: string;
    credentials?: object;
  };
}

export interface CloudConnectorConfig {
  provider: CloudProvider;
  credentials: CloudCredentials;
  region?: string;
}

export interface ScanOptions {
  includeTypes?: string[];
  excludeTypes?: string[];
  includeTags?: Record<string, string>;
  excludeTags?: Record<string, string>;
  includeRegions?: string[];
  excludeRegions?: string[];
  includeCostAnalysis?: boolean;
  includeOptimizationRecommendations?: boolean;
  outputFormat?: 'json' | 'yaml' | 'csv' | 'table';
  outputFile?: string;
  verbose?: boolean;
}

export interface CloudResource {
  id: string;
  name: string;
  type: ResourceType;
  provider: CloudProvider;
  region: string;
  resourceType?: string; // Provider-specific resource type
  status: string;
  createdAt: string;
  tags: Record<string, string>;

  // Compute-specific properties
  instanceType?: string;
  vCpus?: number;
  memory?: number;
  availabilityZone?: string;
  subnetId?: string;
  publicIp?: string;
  privateIp?: string;

  // Storage-specific properties
  storage?: {
    size: number;
    type: string;
    encrypted: boolean;
  };
  storageType?: string;

  // Database-specific properties
  engine?: string;
  engineVersion?: string;

  // Cost information
  estimatedMonthlyCost?: number;

  // Metadata
  metadata?: Record<string, any>;
}

export interface CostBreakdown {
  total: number;
  currency: string;
  breakdown: Record<string, number>;
}

export interface OptimizationOpportunity {
  id: string;
  type: 'cost' | 'performance' | 'security' | 'compliance';
  severity: OptimizationSeverity;
  title: string;
  description: string;
  recommendation: string;
  potentialSavings?: {
    monthly: number;
    annual: number;
    currency: string;
  };
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  resourceIds: string[];
  implementationSteps?: string[];
}

export interface ResourcesByType {
  compute: CloudResource[];
  storage: CloudResource[];
  database: CloudResource[];
  network: CloudResource[];
  serverless: CloudResource[];
}

export interface ScanResult {
  provider: CloudProvider;
  region: string;
  timestamp: string;
  totalResources: number;
  resources: ResourcesByType;
  estimatedMonthlyCost: CostBreakdown;
  optimizationOpportunities: OptimizationOpportunity[];

  // Metadata
  scanDuration?: number;
  errors?: string[];
  warnings?: string[];
}

export interface ConnectorInterface {
  scanResources(options?: ScanOptions): Promise<ScanResult>;
  getCostAnalysis(resourceTypes?: string[]): Promise<CostBreakdown>;
  getOptimizationRecommendations(severity?: OptimizationSeverity): Promise<OptimizationOpportunity[]>;
}

export interface ComparisonResult {
  providers: Array<{
    provider: CloudProvider;
    totalCost: number;
    resourceCount: number;
    savings?: number;
  }>;
  recommendations: {
    cheapest: CloudProvider;
    savings: number;
    migrationComplexity: 'low' | 'medium' | 'high';
    timeline: string;
  };
  summary: {
    totalResourcesAnalyzed: number;
    potentialSavings: number;
    averageCostReduction: number;
  };
}

// Export error types
export class OptimiselyError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: CloudProvider,
    public details?: any
  ) {
    super(message);
    this.name = 'OptimiselyError';
  }
}

export class ConfigurationError extends OptimiselyError {
  constructor(message: string, provider?: CloudProvider) {
    super(message, 'CONFIGURATION_ERROR', provider);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends OptimiselyError {
  constructor(message: string, provider?: CloudProvider) {
    super(message, 'AUTHENTICATION_ERROR', provider);
    this.name = 'AuthenticationError';
  }
}

export class ScanError extends OptimiselyError {
  constructor(message: string, provider?: CloudProvider, details?: any) {
    super(message, 'SCAN_ERROR', provider, details);
    this.name = 'ScanError';
  }
}