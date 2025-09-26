/**
 * Azure Security Scanner
 * Provider-specific implementation for Azure security scanning
 */

import { CloudResource } from './types';

export class AzureSecurityScanner {
  async discoverResources(credentials: any, regions?: string[]): Promise<CloudResource[]> {
    const resources: CloudResource[] = [];

    // For now, return mock data - in production, this would use Azure SDK
    // to discover actual resources

    // Mock Azure resources for demonstration
    const mockResources: CloudResource[] = [
      {
        id: '/subscriptions/123/resourceGroups/rg1/providers/Microsoft.Storage/storageAccounts/mystorageaccount',
        name: 'mystorageaccount',
        type: 'azurerm_storage_account',
        provider: 'azure',
        region: regions?.[0] || 'eastus',
        configuration: {
          accountTier: 'Standard',
          accountReplicationType: 'LRS',
          allowBlobPublicAccess: true, // Vulnerable configuration
          enableHttpsTrafficOnly: false, // Vulnerable configuration
          minimumTlsVersion: 'TLS1_0' // Vulnerable configuration
        }
      },
      {
        id: '/subscriptions/123/resourceGroups/rg1/providers/Microsoft.Network/networkSecurityGroups/myNSG',
        name: 'myNSG',
        type: 'azurerm_network_security_group',
        provider: 'azure',
        region: regions?.[0] || 'eastus',
        configuration: {
          securityRules: [
            {
              name: 'SSH',
              access: 'Allow',
              direction: 'Inbound',
              priority: 100,
              protocol: 'Tcp',
              sourceAddressPrefix: '*', // Vulnerable - allows from anywhere
              sourcePortRange: '*',
              destinationAddressPrefix: '*',
              destinationPortRange: '22'
            }
          ]
        }
      },
      {
        id: '/subscriptions/123/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/myVM',
        name: 'myVM',
        type: 'azurerm_virtual_machine',
        provider: 'azure',
        region: regions?.[0] || 'eastus',
        configuration: {
          vmSize: 'Standard_B2s',
          osProfile: {
            adminUsername: 'azureuser'
          },
          storageOsDisk: {
            managed: true,
            encryption: null // Not encrypted
          },
          networkInterfaces: [
            {
              primary: true,
              ipConfigurations: [
                {
                  publicIpAddress: {
                    id: '/subscriptions/123/resourceGroups/rg1/providers/Microsoft.Network/publicIPAddresses/myPublicIP'
                  }
                }
              ]
            }
          ]
        }
      }
    ];

    return mockResources;
  }
}