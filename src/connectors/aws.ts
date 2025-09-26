import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeSecurityGroupsCommand,
  DescribeVpcsCommand,
  DescribeSubnetsCommand
} from '@aws-sdk/client-ec2';
import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  GetBucketTaggingCommand
} from '@aws-sdk/client-s3';
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand
} from '@aws-sdk/client-rds';
import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionCommand
} from '@aws-sdk/client-lambda';
import {
  CloudProvider,
  ScanResult,
  ComputeResource,
  StorageResource,
  DatabaseResource,
  NetworkResource,
  ServerlessResource,
  OptimizationOpportunity,
  ScanOptions
} from '../types';

export class AWSConnector {
  private ec2Client: EC2Client;
  private s3Client: S3Client;
  private rdsClient: RDSClient;
  private lambdaClient: LambdaClient;
  private region: string;

  constructor(region: string = 'us-east-1', credentials?: any) {
    const config = {
      region,
      ...(credentials && { credentials })
    };

    this.ec2Client = new EC2Client(config);
    this.s3Client = new S3Client(config);
    this.rdsClient = new RDSClient(config);
    this.lambdaClient = new LambdaClient(config);
    this.region = region;
  }

  async scanResources(options: ScanOptions = {}): Promise<ScanResult> {
    const timestamp = new Date().toISOString();
    const resources = {
      compute: [] as ComputeResource[],
      storage: [] as StorageResource[],
      database: [] as DatabaseResource[],
      network: [] as NetworkResource[],
      serverless: [] as ServerlessResource[]
    };

    try {
      // Scan EC2 instances
      if (!options.excludeTypes?.includes('compute')) {
        resources.compute = await this.scanEC2Instances();
      }

      // Scan S3 buckets
      if (!options.excludeTypes?.includes('storage')) {
        resources.storage = await this.scanS3Buckets();
      }

      // Scan RDS instances
      if (!options.excludeTypes?.includes('database')) {
        resources.database = await this.scanRDSInstances();
      }

      // Scan VPCs and networking
      if (!options.excludeTypes?.includes('network')) {
        resources.network = await this.scanNetworkResources();
      }

      // Scan Lambda functions
      if (!options.excludeTypes?.includes('serverless')) {
        resources.serverless = await this.scanLambdaFunctions();
      }

      const totalResources = Object.values(resources).reduce((sum, arr) => sum + arr.length, 0);

      const estimatedCost = this.calculateEstimatedCosts(resources);
      const optimizationOpportunities = options.includeOptimizationRecommendations
        ? this.generateOptimizationRecommendations(resources)
        : [];

      return {
        provider: 'aws',
        region: this.region,
        timestamp,
        totalResources,
        resources,
        estimatedMonthlyCost: estimatedCost,
        optimizationOpportunities
      };
    } catch (error) {
      throw new Error(`AWS scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanEC2Instances(): Promise<ComputeResource[]> {
    try {
      const command = new DescribeInstancesCommand({});
      const response = await this.ec2Client.send(command);
      const instances: ComputeResource[] = [];

      if (response.Reservations) {
        for (const reservation of response.Reservations) {
          if (reservation.Instances) {
            for (const instance of reservation.Instances) {
              const tags: Record<string, string> = {};
              instance.Tags?.forEach(tag => {
                if (tag.Key && tag.Value) tags[tag.Key] = tag.Value;
              });

              instances.push({
                id: instance.InstanceId || 'unknown',
                name: tags.Name || instance.InstanceId || 'unnamed',
                type: 'compute',
                provider: 'aws',
                region: this.region,
                status: this.mapInstanceState(instance.State?.Name),
                tags,
                instanceType: instance.InstanceType || 'unknown',
                vCpus: this.getVCpuCount(instance.InstanceType || ''),
                memory: this.getMemorySize(instance.InstanceType || ''),
                networkInterfaces: instance.NetworkInterfaces?.map(ni => ni.NetworkInterfaceId || '') || [],
                metadata: {
                  imageId: instance.ImageId,
                  keyName: instance.KeyName,
                  platform: instance.Platform,
                  architecture: instance.Architecture,
                  hypervisor: instance.Hypervisor,
                  virtualizationType: instance.VirtualizationType,
                  availabilityZone: instance.Placement?.AvailabilityZone,
                  subnetId: instance.SubnetId,
                  vpcId: instance.VpcId,
                  privateIpAddress: instance.PrivateIpAddress,
                  publicIpAddress: instance.PublicIpAddress
                },
                createdAt: instance.LaunchTime?.toISOString() || ''
              });
            }
          }
        }
      }

      return instances;
    } catch (error) {
      throw new Error(`Failed to scan EC2 instances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanS3Buckets(): Promise<StorageResource[]> {
    try {
      const listCommand = new ListBucketsCommand({});
      const response = await this.s3Client.send(listCommand);
      const buckets: StorageResource[] = [];

      if (response.Buckets) {
        for (const bucket of response.Buckets) {
          if (!bucket.Name) continue;

          let region = this.region;
          try {
            const locationResponse = await this.s3Client.send(
              new GetBucketLocationCommand({ Bucket: bucket.Name })
            );
            region = locationResponse.LocationConstraint || 'us-east-1';
          } catch (error) {
            // Continue with default region if location fetch fails
          }

          let tags: Record<string, string> = {};
          try {
            const taggingResponse = await this.s3Client.send(
              new GetBucketTaggingCommand({ Bucket: bucket.Name })
            );
            if (taggingResponse.TagSet) {
              taggingResponse.TagSet.forEach(tag => {
                if (tag.Key && tag.Value) tags[tag.Key] = tag.Value;
              });
            }
          } catch (error) {
            // Continue without tags if tagging fetch fails
          }

          buckets.push({
            id: bucket.Name,
            name: bucket.Name,
            type: 'storage',
            provider: 'aws',
            region,
            status: 'running',
            tags,
            storageType: 'object',
            size: 0, // Would need additional API calls to get actual size
            encrypted: false, // Would need additional API calls to check encryption
            metadata: {
              bucketName: bucket.Name,
              creationDate: bucket.CreationDate
            },
            createdAt: bucket.CreationDate?.toISOString() || ''
          });
        }
      }

      return buckets;
    } catch (error) {
      throw new Error(`Failed to scan S3 buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanRDSInstances(): Promise<DatabaseResource[]> {
    try {
      const command = new DescribeDBInstancesCommand({});
      const response = await this.rdsClient.send(command);
      const databases: DatabaseResource[] = [];

      if (response.DBInstances) {
        for (const instance of response.DBInstances) {
          const tags: Record<string, string> = {};
          instance.TagList?.forEach(tag => {
            if (tag.Key && tag.Value) tags[tag.Key] = tag.Value;
          });

          databases.push({
            id: instance.DBInstanceIdentifier || 'unknown',
            name: instance.DBName || instance.DBInstanceIdentifier || 'unnamed',
            type: 'database',
            provider: 'aws',
            region: this.region,
            status: this.mapDatabaseStatus(instance.DBInstanceStatus),
            tags,
            engine: instance.Engine || 'unknown',
            version: instance.EngineVersion || 'unknown',
            instanceClass: instance.DBInstanceClass || 'unknown',
            multiAz: instance.MultiAZ || false,
            backupRetention: instance.BackupRetentionPeriod || 0,
            metadata: {
              allocatedStorage: instance.AllocatedStorage,
              storageType: instance.StorageType,
              storageEncrypted: instance.StorageEncrypted,
              availabilityZone: instance.AvailabilityZone,
              preferredBackupWindow: instance.PreferredBackupWindow,
              preferredMaintenanceWindow: instance.PreferredMaintenanceWindow,
              dbSubnetGroup: instance.DBSubnetGroup?.DBSubnetGroupName,
              vpcSecurityGroups: instance.VpcSecurityGroups?.map(sg => sg.VpcSecurityGroupId)
            },
            createdAt: instance.InstanceCreateTime?.toISOString() || ''
          });
        }
      }

      return databases;
    } catch (error) {
      throw new Error(`Failed to scan RDS instances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanNetworkResources(): Promise<NetworkResource[]> {
    try {
      const networkResources: NetworkResource[] = [];

      // Scan VPCs
      const vpcCommand = new DescribeVpcsCommand({});
      const vpcResponse = await this.ec2Client.send(vpcCommand);

      if (vpcResponse.Vpcs) {
        for (const vpc of vpcResponse.Vpcs) {
          const tags: Record<string, string> = {};
          vpc.Tags?.forEach(tag => {
            if (tag.Key && tag.Value) tags[tag.Key] = tag.Value;
          });

          networkResources.push({
            id: vpc.VpcId || 'unknown',
            name: tags.Name || vpc.VpcId || 'unnamed',
            type: 'network',
            provider: 'aws',
            region: this.region,
            status: vpc.State === 'available' ? 'running' : 'unknown',
            createdAt: '',
            tags,
            networkType: 'vpc',
            cidr: vpc.CidrBlock,
            metadata: {
              state: vpc.State,
              dhcpOptionsId: vpc.DhcpOptionsId,
              isDefault: vpc.IsDefault
            }
          });
        }
      }

      return networkResources;
    } catch (error) {
      throw new Error(`Failed to scan network resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanLambdaFunctions(): Promise<ServerlessResource[]> {
    try {
      const command = new ListFunctionsCommand({});
      const response = await this.lambdaClient.send(command);
      const functions: ServerlessResource[] = [];

      if (response.Functions) {
        for (const func of response.Functions) {
          if (!func.FunctionName) continue;

          // Get detailed function info
          const detailCommand = new GetFunctionCommand({
            FunctionName: func.FunctionName
          });
          const detailResponse = await this.lambdaClient.send(detailCommand);

          const tags: Record<string, string> = detailResponse.Tags || {};

          functions.push({
            id: func.FunctionArn || func.FunctionName,
            name: func.FunctionName,
            type: 'serverless',
            provider: 'aws',
            region: this.region,
            status: func.State === 'Active' ? 'running' : 'unknown',
            createdAt: '',
            tags,
            runtime: func.Runtime || 'unknown',
            timeout: func.Timeout || 0,
            memory: func.MemorySize || 0,
            codeSize: func.CodeSize || 0,
            metadata: {
              handler: func.Handler,
              description: func.Description,
              lastModified: func.LastModified,
              version: func.Version,
              architectures: func.Architectures,
              environment: func.Environment?.Variables
            },
            lastModified: func.LastModified ? new Date(func.LastModified).toISOString() : undefined
          });
        }
      }

      return functions;
    } catch (error) {
      throw new Error(`Failed to scan Lambda functions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateEstimatedCosts(resources: any) {
    // Simplified cost estimation - in production, integrate with AWS Cost Explorer API
    let totalCost = 0;
    const breakdown: Record<string, number> = {};

    // Estimate EC2 costs
    resources.compute.forEach((instance: ComputeResource) => {
      const hourlyCost = this.getInstanceHourlyCost(instance.instanceType || '');
      const monthlyCost = hourlyCost * 24 * 30;
      totalCost += monthlyCost;
      breakdown['compute'] = (breakdown['compute'] || 0) + monthlyCost;
    });

    // Estimate S3 costs (basic estimate)
    resources.storage.forEach((bucket: StorageResource) => {
      const monthlyCost = 23; // Rough estimate for standard storage
      totalCost += monthlyCost;
      breakdown['storage'] = (breakdown['storage'] || 0) + monthlyCost;
    });

    // Estimate RDS costs
    resources.database.forEach((db: DatabaseResource) => {
      const monthlyCost = this.getDatabaseMonthlyCost(db.instanceClass || '');
      totalCost += monthlyCost;
      breakdown['database'] = (breakdown['database'] || 0) + monthlyCost;
    });

    // Estimate Lambda costs
    resources.serverless.forEach((func: ServerlessResource) => {
      const monthlyCost = 5; // Basic estimate
      totalCost += monthlyCost;
      breakdown['serverless'] = (breakdown['serverless'] || 0) + monthlyCost;
    });

    return {
      total: Math.round(totalCost * 100) / 100,
      currency: 'USD',
      breakdown
    };
  }

  private generateOptimizationRecommendations(resources: any): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Check for stopped instances
    const stoppedInstances = resources.compute.filter((i: ComputeResource) => i.status === 'stopped');
    if (stoppedInstances.length > 0) {
      opportunities.push({
        id: 'stopped-instances',
        type: 'cost',
        severity: 'medium',
        title: 'Stopped EC2 Instances',
        description: `Found ${stoppedInstances.length} stopped EC2 instances still incurring storage costs`,
        recommendation: 'Terminate unused instances or consider creating AMIs and terminating instances',
        potentialSavings: {
          monthly: stoppedInstances.length * 10,
          annual: stoppedInstances.length * 120,
          currency: 'USD'
        },
        resourceIds: stoppedInstances.map((i: ComputeResource) => i.id),
        effort: 'low',
        impact: 'medium'
      });
    }

    // Check for over-provisioned instances
    const largeInstances = resources.compute.filter((i: ComputeResource) =>
      i.instanceType?.includes('xlarge') || i.instanceType?.includes('2xlarge')
    );
    if (largeInstances.length > 0) {
      opportunities.push({
        id: 'oversized-instances',
        type: 'cost',
        severity: 'high',
        title: 'Over-provisioned Instances',
        description: `Found ${largeInstances.length} potentially over-provisioned instances`,
        recommendation: 'Analyze usage patterns and consider downsizing to smaller instance types',
        potentialSavings: {
          monthly: largeInstances.length * 100,
          annual: largeInstances.length * 1200,
          currency: 'USD'
        },
        resourceIds: largeInstances.map((i: ComputeResource) => i.id),
        effort: 'medium',
        impact: 'high'
      });
    }

    return opportunities;
  }

  // Helper methods
  private mapInstanceState(state?: string): 'running' | 'stopped' | 'pending' | 'terminated' | 'unknown' {
    switch (state) {
      case 'running': return 'running';
      case 'stopped': return 'stopped';
      case 'pending': return 'pending';
      case 'terminated': return 'terminated';
      default: return 'unknown';
    }
  }

  private mapDatabaseStatus(status?: string): 'running' | 'stopped' | 'pending' | 'terminated' | 'unknown' {
    switch (status) {
      case 'available': return 'running';
      case 'stopped': return 'stopped';
      case 'creating':
      case 'modifying': return 'pending';
      case 'deleting': return 'terminated';
      default: return 'unknown';
    }
  }

  private getVCpuCount(instanceType: string): number {
    // Simplified mapping - in production, use AWS API or comprehensive mapping
    const vCpuMap: Record<string, number> = {
      't2.nano': 1, 't2.micro': 1, 't2.small': 1, 't2.medium': 2, 't2.large': 2,
      't3.nano': 2, 't3.micro': 2, 't3.small': 2, 't3.medium': 2, 't3.large': 2,
      'm5.large': 2, 'm5.xlarge': 4, 'm5.2xlarge': 8, 'm5.4xlarge': 16,
      'c5.large': 2, 'c5.xlarge': 4, 'c5.2xlarge': 8, 'c5.4xlarge': 16
    };
    return vCpuMap[instanceType] || 2;
  }

  private getMemorySize(instanceType: string): number {
    // Simplified mapping - in production, use AWS API or comprehensive mapping
    const memoryMap: Record<string, number> = {
      't2.nano': 0.5, 't2.micro': 1, 't2.small': 2, 't2.medium': 4, 't2.large': 8,
      't3.nano': 0.5, 't3.micro': 1, 't3.small': 2, 't3.medium': 4, 't3.large': 8,
      'm5.large': 8, 'm5.xlarge': 16, 'm5.2xlarge': 32, 'm5.4xlarge': 64,
      'c5.large': 4, 'c5.xlarge': 8, 'c5.2xlarge': 16, 'c5.4xlarge': 32
    };
    return memoryMap[instanceType] || 4;
  }

  private getInstanceHourlyCost(instanceType: string): number {
    // Simplified cost mapping - in production, use AWS Pricing API
    const costMap: Record<string, number> = {
      't2.nano': 0.0058, 't2.micro': 0.0116, 't2.small': 0.023, 't2.medium': 0.0464, 't2.large': 0.0928,
      't3.nano': 0.0052, 't3.micro': 0.0104, 't3.small': 0.0208, 't3.medium': 0.0416, 't3.large': 0.0832,
      'm5.large': 0.096, 'm5.xlarge': 0.192, 'm5.2xlarge': 0.384, 'm5.4xlarge': 0.768,
      'c5.large': 0.085, 'c5.xlarge': 0.17, 'c5.2xlarge': 0.34, 'c5.4xlarge': 0.68
    };
    return costMap[instanceType] || 0.1;
  }

  private getDatabaseMonthlyCost(instanceClass: string): number {
    // Simplified cost mapping - in production, use AWS Pricing API
    const costMap: Record<string, number> = {
      'db.t2.micro': 15,
      'db.t2.small': 30,
      'db.t3.micro': 16,
      'db.t3.small': 32,
      'db.m5.large': 145,
      'db.m5.xlarge': 290
    };
    return costMap[instanceClass] || 50;
  }
}