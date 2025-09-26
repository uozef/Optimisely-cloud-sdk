import { ComputeManagementClient } from '@azure/arm-compute';
import { StorageManagementClient } from '@azure/arm-storage';
import { ResourceManagementClient } from '@azure/arm-resources';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import {
  ScanResult,
  ComputeResource,
  StorageResource,
  NetworkResource,
  OptimizationOpportunity,
  ScanOptions
} from '../types';

export class AzureConnector {
  private computeClient: ComputeManagementClient;
  private storageClient: StorageManagementClient;
  private resourceClient: ResourceManagementClient;
  private subscriptionId: string;
  private location: string;

  constructor(subscriptionId: string, location: string = 'eastus', credentials?: any) {
    let credential;

    if (credentials) {
      credential = new ClientSecretCredential(
        credentials.tenantId,
        credentials.clientId,
        credentials.clientSecret
      );
    } else {
      credential = new DefaultAzureCredential();
    }

    this.computeClient = new ComputeManagementClient(credential, subscriptionId);
    this.storageClient = new StorageManagementClient(credential, subscriptionId);
    this.resourceClient = new ResourceManagementClient(credential, subscriptionId);
    this.subscriptionId = subscriptionId;
    this.location = location;
  }

  async scanResources(options: ScanOptions = {}): Promise<ScanResult> {
    const timestamp = new Date().toISOString();
    const resources = {
      compute: [] as ComputeResource[],
      storage: [] as StorageResource[],
      database: [] as any[],
      network: [] as NetworkResource[],
      serverless: [] as any[]
    };

    try {
      // Scan Virtual Machines
      if (!options.excludeTypes?.includes('compute')) {
        resources.compute = await this.scanVirtualMachines();
      }

      // Scan Storage Accounts
      if (!options.excludeTypes?.includes('storage')) {
        resources.storage = await this.scanStorageAccounts();
      }

      // Scan Network Resources
      if (!options.excludeTypes?.includes('network')) {
        resources.network = await this.scanNetworkResources();
      }

      const totalResources = Object.values(resources).reduce((sum, arr) => sum + arr.length, 0);

      const estimatedCost = this.calculateEstimatedCosts(resources);
      const optimizationOpportunities = options.includeOptimizationRecommendations
        ? this.generateOptimizationRecommendations(resources)
        : [];

      return {
        provider: 'azure',
        region: this.location,
        timestamp,
        totalResources,
        resources,
        estimatedMonthlyCost: estimatedCost,
        optimizationOpportunities
      };
    } catch (error) {
      throw new Error(`Azure scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanVirtualMachines(): Promise<ComputeResource[]> {
    try {
      const vms: ComputeResource[] = [];

      for await (const vm of this.computeClient.virtualMachines.listAll()) {
        if (!vm.id || !vm.name) continue;

        // Get VM instance view for power state
        let powerState = 'unknown';
        try {
          const resourceGroup = this.extractResourceGroup(vm.id);
          const instanceView = await this.computeClient.virtualMachines.instanceView(
            resourceGroup,
            vm.name
          );

          const powerStatus = instanceView.statuses?.find(s =>
            s.code?.startsWith('PowerState/')
          );
          powerState = powerStatus?.displayStatus || 'unknown';
        } catch (error) {
          // Continue without power state if fetch fails
        }

        const tags = vm.tags || {};
        const hardwareProfile = vm.hardwareProfile;
        const vmSize = hardwareProfile?.vmSize || 'unknown';

        vms.push({
          id: vm.id,
          name: vm.name,
          type: 'compute',
          provider: 'azure',
          region: vm.location || this.location,
          status: this.mapPowerState(powerState),
          tags,
          instanceType: vmSize,
          vCpus: this.getVMVCpuCount(vmSize),
          memory: this.getVMMemorySize(vmSize),
          createdAt: '',
          networkInterfaces: vm.networkProfile?.networkInterfaces?.map(ni => ni.id || '') || [],
          metadata: {
            resourceGroup: this.extractResourceGroup(vm.id),
            vmId: vm.vmId,
            provisioningState: vm.provisioningState,
            osType: vm.storageProfile?.osDisk?.osType,
            imageReference: vm.storageProfile?.imageReference,
            computerName: vm.osProfile?.computerName,
            adminUsername: vm.osProfile?.adminUsername,
            availabilitySet: vm.availabilitySet?.id,
            zones: vm.zones
          }
        });
      }

      return vms;
    } catch (error) {
      throw new Error(`Failed to scan Azure VMs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanStorageAccounts(): Promise<StorageResource[]> {
    try {
      const storageAccounts: StorageResource[] = [];

      for await (const account of this.storageClient.storageAccounts.list()) {
        if (!account.id || !account.name) continue;

        const tags = account.tags || {};

        storageAccounts.push({
          id: account.id,
          name: account.name,
          type: 'storage',
          provider: 'azure',
          region: account.location || this.location,
          status: account.statusOfPrimary === 'available' ? 'running' : 'unknown',
          tags,
          storageType: 'object',
          size: 0, // Would need additional API calls to get actual usage
          encrypted: account.encryption?.services?.blob?.enabled || false,
          metadata: {
            resourceGroup: this.extractResourceGroup(account.id),
            kind: account.kind,
            sku: account.sku,
            accessTier: account.accessTier,
            provisioningState: account.provisioningState,
            creationTime: account.creationTime,
            primaryLocation: account.primaryLocation,
            statusOfPrimary: account.statusOfPrimary,
            allowBlobPublicAccess: account.allowBlobPublicAccess,
            minimumTlsVersion: account.minimumTlsVersion
          },
          createdAt: account.creationTime?.toISOString() || ''
        });
      }

      return storageAccounts;
    } catch (error) {
      throw new Error(`Failed to scan Azure Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanNetworkResources(): Promise<NetworkResource[]> {
    try {
      const networkResources: NetworkResource[] = [];

      // Get all resource groups to scan for VNets
      const resourceGroups = [];
      for await (const rg of this.resourceClient.resourceGroups.list()) {
        if (rg.name) resourceGroups.push(rg.name);
      }

      // Scan Virtual Networks in each resource group
      for (const rgName of resourceGroups) {
        try {
          const vnets = await this.resourceClient.resources.listByResourceGroup(rgName, {
            filter: "resourceType eq 'Microsoft.Network/virtualNetworks'"
          });

          for await (const vnet of vnets) {
            if (!vnet.id || !vnet.name) continue;

            const tags = vnet.tags || {};

            networkResources.push({
              id: vnet.id,
              name: vnet.name,
              type: 'network',
              provider: 'azure',
              region: vnet.location || this.location,
              status: 'running',
              createdAt: '',
              tags,
              networkType: 'vpc',
              metadata: {
                resourceGroup: rgName,
                kind: vnet.kind,
                provisioningState: 'Succeeded' // Default for existing resources
              }
            });
          }
        } catch (error) {
          // Continue with next resource group if this one fails
          continue;
        }
      }

      return networkResources;
    } catch (error) {
      throw new Error(`Failed to scan Azure networks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateEstimatedCosts(resources: any) {
    let totalCost = 0;
    const breakdown: Record<string, number> = {};

    // Estimate VM costs
    resources.compute.forEach((vm: ComputeResource) => {
      const hourlyCost = this.getVMHourlyCost(vm.instanceType || '');
      const monthlyCost = hourlyCost * 24 * 30;
      totalCost += monthlyCost;
      breakdown['compute'] = (breakdown['compute'] || 0) + monthlyCost;
    });

    // Estimate Storage costs
    resources.storage.forEach((storage: StorageResource) => {
      const monthlyCost = 25; // Rough estimate for standard storage
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

    // Check for deallocated VMs
    const stoppedVMs = resources.compute.filter((vm: ComputeResource) => vm.status === 'stopped');
    if (stoppedVMs.length > 0) {
      opportunities.push({
        id: 'deallocated-vms',
        type: 'cost',
        severity: 'medium',
        title: 'Deallocated Virtual Machines',
        description: `Found ${stoppedVMs.length} deallocated VMs that may still incur storage costs`,
        recommendation: 'Review and delete unused VMs or ensure they are properly deallocated',
        potentialSavings: {
          monthly: stoppedVMs.length * 15,
          annual: stoppedVMs.length * 180,
          currency: 'USD'
        },
        resourceIds: stoppedVMs.map((vm: ComputeResource) => vm.id),
        effort: 'low',
        impact: 'medium'
      });
    }

    // Check for premium storage accounts with low usage
    const premiumStorage = resources.storage.filter((s: StorageResource) =>
      s.metadata?.sku?.name?.includes('Premium')
    );
    if (premiumStorage.length > 0) {
      opportunities.push({
        id: 'premium-storage-optimization',
        type: 'cost',
        severity: 'medium',
        title: 'Premium Storage Optimization',
        description: `Found ${premiumStorage.length} premium storage accounts that could be optimized`,
        recommendation: 'Evaluate if premium performance is required or if standard storage would suffice',
        potentialSavings: {
          monthly: premiumStorage.length * 50,
          annual: premiumStorage.length * 600,
          currency: 'USD'
        },
        resourceIds: premiumStorage.map((s: StorageResource) => s.id),
        effort: 'medium',
        impact: 'medium'
      });
    }

    return opportunities;
  }

  // Helper methods
  private extractResourceGroup(resourceId: string): string {
    const match = resourceId.match(/resourceGroups\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }

  private mapPowerState(powerState: string): 'running' | 'stopped' | 'pending' | 'terminated' | 'unknown' {
    const state = powerState.toLowerCase();
    if (state.includes('running')) return 'running';
    if (state.includes('stopped') || state.includes('deallocated')) return 'stopped';
    if (state.includes('starting') || state.includes('stopping')) return 'pending';
    return 'unknown';
  }

  private getVMVCpuCount(vmSize: string): number {
    // Simplified mapping for common Azure VM sizes
    const vCpuMap: Record<string, number> = {
      'Standard_B1s': 1, 'Standard_B1ms': 1, 'Standard_B2s': 2, 'Standard_B2ms': 2,
      'Standard_D2s_v3': 2, 'Standard_D4s_v3': 4, 'Standard_D8s_v3': 8, 'Standard_D16s_v3': 16,
      'Standard_F2s_v2': 2, 'Standard_F4s_v2': 4, 'Standard_F8s_v2': 8, 'Standard_F16s_v2': 16,
      'Standard_A1_v2': 1, 'Standard_A2_v2': 2, 'Standard_A4_v2': 4, 'Standard_A8_v2': 8
    };
    return vCpuMap[vmSize] || 2;
  }

  private getVMMemorySize(vmSize: string): number {
    // Simplified mapping for common Azure VM sizes (in GB)
    const memoryMap: Record<string, number> = {
      'Standard_B1s': 1, 'Standard_B1ms': 2, 'Standard_B2s': 4, 'Standard_B2ms': 8,
      'Standard_D2s_v3': 8, 'Standard_D4s_v3': 16, 'Standard_D8s_v3': 32, 'Standard_D16s_v3': 64,
      'Standard_F2s_v2': 4, 'Standard_F4s_v2': 8, 'Standard_F8s_v2': 16, 'Standard_F16s_v2': 32,
      'Standard_A1_v2': 2, 'Standard_A2_v2': 4, 'Standard_A4_v2': 8, 'Standard_A8_v2': 16
    };
    return memoryMap[vmSize] || 4;
  }

  private getVMHourlyCost(vmSize: string): number {
    // Simplified cost mapping for common Azure VM sizes
    const costMap: Record<string, number> = {
      'Standard_B1s': 0.0104, 'Standard_B1ms': 0.0207, 'Standard_B2s': 0.0416, 'Standard_B2ms': 0.0832,
      'Standard_D2s_v3': 0.096, 'Standard_D4s_v3': 0.192, 'Standard_D8s_v3': 0.384, 'Standard_D16s_v3': 0.768,
      'Standard_F2s_v2': 0.085, 'Standard_F4s_v2': 0.169, 'Standard_F8s_v2': 0.338, 'Standard_F16s_v2': 0.677,
      'Standard_A1_v2': 0.055, 'Standard_A2_v2': 0.109, 'Standard_A4_v2': 0.218, 'Standard_A8_v2': 0.436
    };
    return costMap[vmSize] || 0.1;
  }
}