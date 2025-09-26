/**
 * GCP Security Scanner
 * Provider-specific implementation for GCP security scanning
 */

import { CloudResource } from './types';

export class GCPSecurityScanner {
  async discoverResources(credentials: any, regions?: string[]): Promise<CloudResource[]> {
    const resources: CloudResource[] = [];

    // For now, return mock data - in production, this would use GCP SDK
    // to discover actual resources

    // Mock GCP resources for demonstration
    const mockResources: CloudResource[] = [
      {
        id: 'projects/my-project/zones/us-central1-a/instances/my-instance',
        name: 'my-instance',
        type: 'google_compute_instance',
        provider: 'gcp',
        region: regions?.[0] || 'us-central1',
        configuration: {
          machineType: 'projects/my-project/zones/us-central1-a/machineTypes/n1-standard-1',
          status: 'RUNNING',
          networkInterfaces: [
            {
              network: 'projects/my-project/global/networks/default',
              accessConfigs: [
                {
                  type: 'ONE_TO_ONE_NAT',
                  natIP: '34.123.45.67' // Has external IP
                }
              ]
            }
          ],
          disks: [
            {
              boot: true,
              encrypted: false // Not encrypted
            }
          ],
          serviceAccounts: [
            {
              email: 'my-project@developer.gserviceaccount.com',
              scopes: [
                'https://www.googleapis.com/auth/cloud-platform' // Too broad
              ]
            }
          ]
        }
      },
      {
        id: 'projects/my-project/global/networks/default',
        name: 'default',
        type: 'google_compute_network',
        provider: 'gcp',
        region: 'global',
        configuration: {
          autoCreateSubnetworks: true,
          routingConfig: {
            routingMode: 'REGIONAL'
          }
        }
      },
      {
        id: 'projects/my-project/global/firewalls/default-allow-ssh',
        name: 'default-allow-ssh',
        type: 'google_compute_firewall',
        provider: 'gcp',
        region: 'global',
        configuration: {
          direction: 'INGRESS',
          priority: 65534,
          sourceRanges: ['0.0.0.0/0'], // Allows from anywhere
          allowed: [
            {
              IPProtocol: 'tcp',
              ports: ['22']
            }
          ],
          targetTags: ['ssh-server']
        }
      }
    ];

    return mockResources;
  }
}