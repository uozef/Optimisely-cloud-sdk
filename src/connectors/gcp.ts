import Compute from '@google-cloud/compute';
import { Storage } from '@google-cloud/storage';
import ResourceManager from '@google-cloud/resource-manager';
import {
  ScanResult,
  ComputeResource,
  StorageResource,
  NetworkResource,
  OptimizationOpportunity,
  ScanOptions
} from '../types';

export class GCPConnector {
  private computeClient: any;
  private storageClient: Storage;
  private resourceManager: any;
  private projectId: string;
  private zone: string;

  constructor(projectId: string, zone: string = 'us-central1-a', credentials?: any) {
    const config = credentials ? { projectId, credentials } : { projectId };

    // Note: In a real implementation, use proper GCP client constructors
    this.computeClient = null; // Placeholder for demo
    this.storageClient = new Storage(config);
    this.resourceManager = null; // Placeholder for demo
    this.projectId = projectId;
    this.zone = zone;
  }

  async scanResources(options: ScanOptions = {}): Promise<ScanResult> {
    const timestamp = new Date();
    const resources = {
      compute: [] as ComputeResource[],
      storage: [] as StorageResource[],
      database: [] as any[],
      network: [] as NetworkResource[],
      serverless: [] as any[]
    };

    try {
      // Scan Compute Engine instances
      if (!options.excludeTypes?.includes('compute')) {
        resources.compute = await this.scanComputeInstances();
      }

      // Scan Cloud Storage buckets
      if (!options.excludeTypes?.includes('storage')) {
        resources.storage = await this.scanStorageBuckets();
      }

      // Scan VPC networks
      if (!options.excludeTypes?.includes('network')) {
        resources.network = await this.scanNetworkResources();
      }

      const totalResources = Object.values(resources).reduce((sum, arr) => sum + arr.length, 0);

      const estimatedCost = this.calculateEstimatedCosts(resources);
      const optimizationOpportunities = options.includeOptimizationRecommendations
        ? this.generateOptimizationRecommendations(resources)
        : [];

      return {
        provider: 'gcp',
        region: this.zone.substring(0, this.zone.lastIndexOf('-')), // Extract region from zone
        timestamp,
        totalResources,
        resources,
        estimatedMonthlyCost: estimatedCost,
        optimizationOpportunities
      };
    } catch (error) {
      throw new Error(`GCP scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanComputeInstances(): Promise<ComputeResource[]> {
    // For demo purposes, return empty array
    // In production, implement proper GCP Compute Engine API calls
    return [];
  }

  private async scanStorageBuckets(): Promise<StorageResource[]> {
    try {
      const [buckets] = await this.storageClient.getBuckets();
      const storageResources: StorageResource[] = [];

      for (const bucket of buckets) {
        const [metadata] = await bucket.getMetadata();

        const tags: Record<string, string> = {};
        if (metadata.labels) {
          Object.assign(tags, metadata.labels);
        }

        storageResources.push({
          id: metadata.id || metadata.name || 'unknown',
          name: metadata.name || 'unknown',
          type: 'storage',
          provider: 'gcp',
          region: metadata.location || 'unknown',
          status: 'running',
          tags,
          storageType: 'object',
          size: 0, // Would need additional API calls to get actual usage
          encrypted: false, // Would need to check encryption configuration
          metadata: {
            bucketName: metadata.name,
            storageClass: metadata.storageClass,
            location: metadata.location,
            locationType: metadata.locationType,
            metageneration: metadata.metageneration,
            projectNumber: metadata.projectNumber,
            selfLink: metadata.selfLink,
            timeCreated: metadata.timeCreated,
            updated: metadata.updated,
            versioning: metadata.versioning,
            website: metadata.website,
            cors: metadata.cors,
            lifecycle: metadata.lifecycle,
            logging: metadata.logging,
            encryption: metadata.encryption,
            billing: metadata.billing,
            retentionPolicy: metadata.retentionPolicy
          },
          createdAt: metadata.timeCreated ? new Date(metadata.timeCreated) : undefined
        });
      }

      return storageResources;
    } catch (error) {
      throw new Error(`Failed to scan GCP Storage buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanNetworkResources(): Promise<NetworkResource[]> {
    // For demo purposes, return empty array
    return [];
  }

  private async getProjectZones(): Promise<Array<{ name: string; region?: string }>> {
    // Return default zone
    return [{ name: this.zone, region: this.zone.substring(0, this.zone.lastIndexOf('-')) }];
  }

  private calculateEstimatedCosts(resources: any) {
    let totalCost = 0;
    const breakdown: Record<string, number> = {};

    // Estimate Compute Engine costs
    resources.compute.forEach((instance: ComputeResource) => {
      const hourlyCost = this.getGCPInstanceHourlyCost(instance.instanceType);
      const monthlyCost = hourlyCost * 24 * 30;
      totalCost += monthlyCost;
      breakdown['compute'] = (breakdown['compute'] || 0) + monthlyCost;
    });

    // Estimate Cloud Storage costs
    resources.storage.forEach((bucket: StorageResource) => {
      const monthlyCost = 20; // Rough estimate for standard storage
      totalCost += monthlyCost;
      breakdown['storage'] = (breakdown['storage'] || 0) + monthlyCost;
    });

    return {
      total: Math.round(totalCost * 100) / 100,
      currency: 'USD',
      breakdown
    };
  }

  private generateOptimizationRecommendations(resources: any): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Check for terminated instances
    const stoppedInstances = resources.compute.filter((i: ComputeResource) => i.status === 'stopped');
    if (stoppedInstances.length > 0) {
      opportunities.push({
        id: 'stopped-gcp-instances',
        type: 'cost',
        severity: 'medium',
        title: 'Stopped GCP Compute Instances',
        description: `Found ${stoppedInstances.length} stopped instances still incurring disk costs`,
        recommendation: 'Delete unused instances or create snapshots and delete instances',
        potentialSavings: {
          monthly: stoppedInstances.length * 12,
          annual: stoppedInstances.length * 144,
          currency: 'USD'
        },
        resourceIds: stoppedInstances.map((i: ComputeResource) => i.id),
        effort: 'low',
        impact: 'medium'
      });
    }

    // Check for high-performance machine types
    const highPerfInstances = resources.compute.filter((i: ComputeResource) =>
      i.instanceType.includes('n1-highmem') || i.instanceType.includes('n1-highcpu') ||
      i.instanceType.includes('n2-highmem') || i.instanceType.includes('n2-highcpu')
    );
    if (highPerfInstances.length > 0) {
      opportunities.push({
        id: 'high-performance-instances',
        type: 'cost',
        severity: 'high',
        title: 'High-Performance Instances',
        description: `Found ${highPerfInstances.length} high-performance instances that may be over-provisioned`,
        recommendation: 'Evaluate workload requirements and consider using standard machine types',
        potentialSavings: {
          monthly: highPerfInstances.length * 80,
          annual: highPerfInstances.length * 960,
          currency: 'USD'
        },
        resourceIds: highPerfInstances.map((i: ComputeResource) => i.id),
        effort: 'medium',
        impact: 'high'
      });
    }

    return opportunities;
  }

  // Helper methods
  private mapVMStatus(status?: string): 'running' | 'stopped' | 'pending' | 'terminated' | 'unknown' {
    switch (status) {
      case 'RUNNING': return 'running';
      case 'STOPPED': case 'TERMINATED': return 'stopped';
      case 'PROVISIONING': case 'STAGING': return 'pending';
      default: return 'unknown';
    }
  }

  private getGCPVCpuCount(machineType: string): number {
    // Parse GCP machine type for vCPU count
    if (machineType.includes('custom')) {
      const match = machineType.match(/custom-(\d+)-/);
      return match ? parseInt(match[1]) : 2;
    }

    const vCpuMap: Record<string, number> = {
      'f1-micro': 1, 'g1-small': 1,
      'n1-standard-1': 1, 'n1-standard-2': 2, 'n1-standard-4': 4, 'n1-standard-8': 8,
      'n1-highmem-2': 2, 'n1-highmem-4': 4, 'n1-highmem-8': 8,
      'n1-highcpu-2': 2, 'n1-highcpu-4': 4, 'n1-highcpu-8': 8,
      'n2-standard-2': 2, 'n2-standard-4': 4, 'n2-standard-8': 8,
      'e2-micro': 1, 'e2-small': 1, 'e2-medium': 1, 'e2-standard-2': 2, 'e2-standard-4': 4
    };
    return vCpuMap[machineType] || 2;
  }

  private getGCPMemorySize(machineType: string): number {
    // Parse GCP machine type for memory (in GB)
    if (machineType.includes('custom')) {
      const match = machineType.match(/custom-\d+-(\d+)/);
      return match ? parseInt(match[1]) / 1024 : 4; // Convert from MB to GB
    }

    const memoryMap: Record<string, number> = {
      'f1-micro': 0.6, 'g1-small': 1.7,
      'n1-standard-1': 3.75, 'n1-standard-2': 7.5, 'n1-standard-4': 15, 'n1-standard-8': 30,
      'n1-highmem-2': 13, 'n1-highmem-4': 26, 'n1-highmem-8': 52,
      'n1-highcpu-2': 1.8, 'n1-highcpu-4': 3.6, 'n1-highcpu-8': 7.2,
      'n2-standard-2': 8, 'n2-standard-4': 16, 'n2-standard-8': 32,
      'e2-micro': 1, 'e2-small': 2, 'e2-medium': 4, 'e2-standard-2': 8, 'e2-standard-4': 16
    };
    return memoryMap[machineType] || 4;
  }

  private getGCPInstanceHourlyCost(machineType: string): number {
    // Simplified cost mapping for common GCP machine types
    const costMap: Record<string, number> = {
      'f1-micro': 0.0076, 'g1-small': 0.027,
      'n1-standard-1': 0.0475, 'n1-standard-2': 0.095, 'n1-standard-4': 0.19, 'n1-standard-8': 0.38,
      'n1-highmem-2': 0.118, 'n1-highmem-4': 0.236, 'n1-highmem-8': 0.472,
      'n1-highcpu-2': 0.0709, 'n1-highcpu-4': 0.1418, 'n1-highcpu-8': 0.2836,
      'n2-standard-2': 0.097, 'n2-standard-4': 0.194, 'n2-standard-8': 0.388,
      'e2-micro': 0.00838, 'e2-small': 0.01675, 'e2-medium': 0.0335, 'e2-standard-2': 0.067, 'e2-standard-4': 0.134
    };
    return costMap[machineType] || 0.095;
  }
}