/**
 * AWS Security Scanner
 * Provider-specific implementation for AWS security scanning
 */

import { CloudResource } from './types';
import AWS from 'aws-sdk';

export class AWSSecurityScanner {
  private ec2: AWS.EC2;
  private s3: AWS.S3;
  private rds: AWS.RDS;
  private cloudtrail: AWS.CloudTrail;
  private iam: AWS.IAM;

  constructor() {
    this.ec2 = new AWS.EC2();
    this.s3 = new AWS.S3();
    this.rds = new AWS.RDS();
    this.cloudtrail = new AWS.CloudTrail();
    this.iam = new AWS.IAM();
  }

  async discoverResources(credentials: any, regions?: string[]): Promise<CloudResource[]> {
    const resources: CloudResource[] = [];
    const targetRegions = regions || ['us-east-1'];

    for (const region of targetRegions) {
      // Configure AWS SDK for the region
      AWS.config.update({
        accessKeyId: credentials.aws?.accessKeyId,
        secretAccessKey: credentials.aws?.secretAccessKey,
        sessionToken: credentials.aws?.sessionToken,
        region: region
      });

      // Reinitialize services for the region
      this.ec2 = new AWS.EC2();
      this.s3 = new AWS.S3();
      this.rds = new AWS.RDS();
      this.cloudtrail = new AWS.CloudTrail();
      this.iam = new AWS.IAM();

      // Discover EC2 instances
      try {
        const ec2Instances = await this.discoverEC2Instances(region);
        resources.push(...ec2Instances);
      } catch (error) {
        console.warn(`Failed to discover EC2 instances in ${region}:`, error);
      }

      // Discover S3 buckets (only once, not per region)
      if (region === 'us-east-1') {
        try {
          const s3Buckets = await this.discoverS3Buckets();
          resources.push(...s3Buckets);
        } catch (error) {
          console.warn('Failed to discover S3 buckets:', error);
        }
      }

      // Discover RDS instances
      try {
        const rdsInstances = await this.discoverRDSInstances(region);
        resources.push(...rdsInstances);
      } catch (error) {
        console.warn(`Failed to discover RDS instances in ${region}:`, error);
      }

      // Discover Security Groups
      try {
        const securityGroups = await this.discoverSecurityGroups(region);
        resources.push(...securityGroups);
      } catch (error) {
        console.warn(`Failed to discover Security Groups in ${region}:`, error);
      }

      // Discover CloudTrail
      try {
        const cloudTrails = await this.discoverCloudTrails(region);
        resources.push(...cloudTrails);
      } catch (error) {
        console.warn(`Failed to discover CloudTrail in ${region}:`, error);
      }
    }

    return resources;
  }

  private async discoverEC2Instances(region: string): Promise<CloudResource[]> {
    const result = await this.ec2.describeInstances().promise();
    const resources: CloudResource[] = [];

    result.Reservations?.forEach((reservation: any) => {
      reservation.Instances?.forEach((instance: any) => {
        if (instance.InstanceId) {
          resources.push({
            id: instance.InstanceId,
            name: this.getResourceName(instance.Tags) || instance.InstanceId,
            type: 'aws_instance',
            provider: 'aws',
            region: region,
            tags: this.convertTags(instance.Tags),
            configuration: {
              instanceType: instance.InstanceType,
              state: instance.State?.Name,
              publicIpAddress: instance.PublicIpAddress,
              privateIpAddress: instance.PrivateIpAddress,
              subnetId: instance.SubnetId,
              vpcId: instance.VpcId,
              securityGroups: instance.SecurityGroups,
              keyName: instance.KeyName,
              associatePublicIpAddress: !!instance.PublicIpAddress,
              ebsOptimized: instance.EbsOptimized,
              monitoring: instance.Monitoring,
              iamInstanceProfile: instance.IamInstanceProfile
            }
          });
        }
      });
    });

    return resources;
  }

  private async discoverS3Buckets(): Promise<CloudResource[]> {
    const result = await this.s3.listBuckets().promise();
    const resources: CloudResource[] = [];

    if (result.Buckets) {
      for (const bucket of result.Buckets) {
        if (bucket.Name) {
          try {
            // Get bucket location
            const location = await this.s3.getBucketLocation({ Bucket: bucket.Name }).promise();

            // Get bucket ACL
            const acl = await this.s3.getBucketAcl({ Bucket: bucket.Name }).promise();

            // Get bucket policy (if exists)
            let policy = null;
            try {
              const policyResult = await this.s3.getBucketPolicy({ Bucket: bucket.Name }).promise();
              policy = JSON.parse(policyResult.Policy || '{}');
            } catch (e) {
              // Policy might not exist, which is fine
            }

            // Get bucket encryption
            let encryption = null;
            try {
              encryption = await this.s3.getBucketEncryption({ Bucket: bucket.Name }).promise();
            } catch (e) {
              // Encryption might not be configured
            }

            // Get bucket versioning
            const versioning = await this.s3.getBucketVersioning({ Bucket: bucket.Name }).promise();

            // Get bucket logging
            const logging = await this.s3.getBucketLogging({ Bucket: bucket.Name }).promise();

            resources.push({
              id: bucket.Name,
              name: bucket.Name,
              type: 'aws_s3_bucket',
              provider: 'aws',
              region: location.LocationConstraint || 'us-east-1',
              configuration: {
                creationDate: bucket.CreationDate,
                acl: acl,
                policy: policy,
                encryption: encryption,
                versioning: versioning,
                logging: logging
              }
            });
          } catch (error) {
            console.warn(`Failed to get details for bucket ${bucket.Name}:`, error);
          }
        }
      }
    }

    return resources;
  }

  private async discoverRDSInstances(region: string): Promise<CloudResource[]> {
    const result = await this.rds.describeDBInstances().promise();
    const resources: CloudResource[] = [];

    result.DBInstances?.forEach((instance: any) => {
      if (instance.DBInstanceIdentifier) {
        resources.push({
          id: instance.DBInstanceIdentifier,
          name: instance.DBInstanceIdentifier,
          type: 'aws_db_instance',
          provider: 'aws',
          region: region,
          tags: this.convertTags(instance.TagList),
          configuration: {
            dbInstanceClass: instance.DBInstanceClass,
            engine: instance.Engine,
            engineVersion: instance.EngineVersion,
            dbInstanceStatus: instance.DBInstanceStatus,
            endpoint: instance.Endpoint,
            port: instance.DbInstancePort,
            publiclyAccessible: instance.PubliclyAccessible,
            storageEncrypted: instance.StorageEncrypted,
            kmsKeyId: instance.KmsKeyId,
            multiAZ: instance.MultiAZ,
            backupRetentionPeriod: instance.BackupRetentionPeriod,
            dbSubnetGroup: instance.DBSubnetGroup,
            vpcSecurityGroups: instance.VpcSecurityGroups,
            autoMinorVersionUpgrade: instance.AutoMinorVersionUpgrade,
            deletionProtection: instance.DeletionProtection
          }
        });
      }
    });

    return resources;
  }

  private async discoverSecurityGroups(region: string): Promise<CloudResource[]> {
    const result = await this.ec2.describeSecurityGroups().promise();
    const resources: CloudResource[] = [];

    result.SecurityGroups?.forEach((sg: any) => {
      if (sg.GroupId) {
        resources.push({
          id: sg.GroupId,
          name: sg.GroupName || sg.GroupId,
          type: 'aws_security_group',
          provider: 'aws',
          region: region,
          tags: this.convertTags(sg.Tags),
          configuration: {
            groupName: sg.GroupName,
            description: sg.Description,
            vpcId: sg.VpcId,
            ipPermissions: sg.IpPermissions,
            ipPermissionsEgress: sg.IpPermissionsEgress
          }
        });
      }
    });

    return resources;
  }

  private async discoverCloudTrails(region: string): Promise<CloudResource[]> {
    const result = await this.cloudtrail.describeTrails().promise();
    const resources: CloudResource[] = [];

    if (result.trailList) {
      for (const trail of result.trailList) {
        if (trail.Name) {
          try {
            // Get trail status
            const status = await this.cloudtrail.getTrailStatus({ Name: trail.Name }).promise();

            // Get event selectors
            const eventSelectors = await this.cloudtrail.getEventSelectors({ TrailName: trail.Name }).promise();

            resources.push({
              id: trail.TrailARN || trail.Name,
              name: trail.Name,
              type: 'aws_cloudtrail',
              provider: 'aws',
              region: region,
              configuration: {
                s3BucketName: trail.S3BucketName,
                s3KeyPrefix: trail.S3KeyPrefix,
                snsTopicName: trail.SnsTopicName,
                includeGlobalServiceEvents: trail.IncludeGlobalServiceEvents,
                isMultiRegionTrail: trail.IsMultiRegionTrail,
                homeRegion: trail.HomeRegion,
                isLogging: status.IsLogging,
                kmsKeyId: trail.KmsKeyId,
                hasCustomEventSelectors: trail.HasCustomEventSelectors,
                hasInsightSelectors: trail.HasInsightSelectors,
                isOrganizationTrail: trail.IsOrganizationTrail,
                eventSelectors: eventSelectors
              }
            });
          } catch (error) {
            console.warn(`Failed to get details for trail ${trail.Name}:`, error);
          }
        }
      }
    }

    return resources;
  }

  private getResourceName(tags?: AWS.EC2.Tag[] | AWS.RDS.Tag[]): string | undefined {
    return tags?.find(tag => tag.Key === 'Name')?.Value;
  }

  private convertTags(tags?: AWS.EC2.Tag[] | AWS.RDS.Tag[]): Record<string, string> | undefined {
    if (!tags) return undefined;

    const result: Record<string, string> = {};
    tags.forEach(tag => {
      if (tag.Key && tag.Value) {
        result[tag.Key] = tag.Value;
      }
    });
    return result;
  }
}