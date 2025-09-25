export interface CloudProvider {
  name: 'aws' | 'azure' | 'gcp';
  region?: string;
  credentials?: any;
}

export interface CloudResource {
  id: string;
  name: string;
  type: string;
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  status: 'running' | 'stopped' | 'pending' | 'terminated' | 'unknown';
  tags: Record<string, string>;
  cost?: {
    monthly: number;
    currency: string;
  };
  metadata: Record<string, any>;
  createdAt?: Date;
  lastModified?: Date;
}

export interface ComputeResource extends CloudResource {
  type: 'compute';
  instanceType: string;
  vCpus: number;
  memory: number;
  storage?: number;
  networkInterfaces: string[];
}

export interface StorageResource extends CloudResource {
  type: 'storage';
  storageType: 'block' | 'object' | 'file';
  size: number;
  encrypted: boolean;
}

export interface DatabaseResource extends CloudResource {
  type: 'database';
  engine: string;
  version: string;
  instanceClass: string;
  multiAz: boolean;
  backupRetention: number;
}

export interface NetworkResource extends CloudResource {
  type: 'network';
  networkType: 'vpc' | 'subnet' | 'security_group' | 'load_balancer';
  cidr?: string;
  availabilityZone?: string;
}

export interface ServerlessResource extends CloudResource {
  type: 'serverless';
  runtime: string;
  timeout: number;
  memory: number;
  codeSize?: number;
}

export interface ScanResult {
  provider: 'aws' | 'azure' | 'gcp';
  region: string;
  timestamp: Date;
  totalResources: number;
  resources: {
    compute: ComputeResource[];
    storage: StorageResource[];
    database: DatabaseResource[];
    network: NetworkResource[];
    serverless: ServerlessResource[];
  };
  estimatedMonthlyCost: {
    total: number;
    currency: string;
    breakdown: Record<string, number>;
  };
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface OptimizationOpportunity {
  id: string;
  type: 'cost' | 'performance' | 'security' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  potentialSavings?: {
    monthly: number;
    annual: number;
    currency: string;
  };
  resourceIds: string[];
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface CloudConnectorConfig {
  provider: 'aws' | 'azure' | 'gcp';
  credentials: {
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
      keyFilename: string;
      credentials?: any;
    };
  };
  regions?: string[];
  includeServices?: string[];
  excludeServices?: string[];
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