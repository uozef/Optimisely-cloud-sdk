/**
 * Security Rules Repository
 * Comprehensive collection of cloud security rules
 */

import { SecurityRule, SecurityRuleResult, SecurityScanContext, SecuritySeverity, SecurityCategory, ComplianceFramework } from './types';

export class SecurityRules {
  private static rules: SecurityRule[] = [];

  static getAllRules(): SecurityRule[] {
    if (this.rules.length === 0) {
      this.initializeRules();
    }
    return this.rules;
  }

  private static initializeRules() {
    this.rules = [
      // AWS Rules
      ...this.getAWSRules(),
      // Azure Rules
      ...this.getAzureRules(),
      // GCP Rules
      ...this.getGCPRules(),
      // Multi-Cloud Rules
      ...this.getMultiCloudRules()
    ];
  }

  private static getAWSRules(): SecurityRule[] {
    return [
      {
        id: 'AWS-001',
        name: 'S3 Bucket Public Read Access',
        description: 'S3 buckets should not allow public read access',
        severity: 'critical',
        category: 'access_control',
        provider: 'aws',
        resourceTypes: ['aws_s3_bucket'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const publicRead = resource.configuration?.acl?.grants?.some((grant: any) =>
            grant.grantee?.uri?.includes('AllUsers') && grant.permission === 'READ'
          ) || resource.configuration?.policy?.Statement?.some((stmt: any) =>
            stmt.Effect === 'Allow' &&
            (stmt.Principal === '*' || stmt.Principal?.AWS === '*') &&
            (stmt.Action?.includes('s3:GetObject') || stmt.Action?.includes('s3:*'))
          );

          if (publicRead) {
            return {
              passed: false,
              finding: {
                description: 'S3 bucket allows public read access, which could lead to data exposure',
                evidence: {
                  bucketName: resource.name,
                  acl: resource.configuration?.acl,
                  policy: resource.configuration?.policy
                },
                recommendation: 'Remove public read access and implement proper IAM policies'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Remove public access and implement proper access controls',
          steps: [
            'Navigate to S3 console',
            'Select the bucket',
            'Go to Permissions tab',
            'Block all public access',
            'Configure bucket policy with specific permissions'
          ],
          automatable: true,
          terraform: `
resource "aws_s3_bucket_public_access_block" "example" {
  bucket = aws_s3_bucket.example.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`
        },
        references: [
          'https://docs.aws.amazon.com/s3/latest/userguide/access-control-block-public-access.html',
          'https://aws.amazon.com/s3/features/block-public-access/'
        ],
        complianceFrameworks: [
          { name: 'CIS AWS Foundations', requirement: '2.1.1', description: 'Ensure S3 bucket access logging is enabled' },
          { name: 'SOC 2', requirement: 'CC6.1', description: 'Logical and physical access controls' }
        ],
        tags: ['s3', 'data-protection', 'public-access']
      },

      {
        id: 'AWS-002',
        name: 'EC2 Instance Public IP',
        description: 'EC2 instances should not have public IP addresses unless necessary',
        severity: 'high',
        category: 'network_security',
        provider: 'aws',
        resourceTypes: ['aws_instance'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const hasPublicIP = resource.configuration?.publicIpAddress || resource.configuration?.associatePublicIpAddress;

          if (hasPublicIP) {
            return {
              passed: false,
              finding: {
                description: 'EC2 instance has a public IP address, increasing attack surface',
                evidence: {
                  instanceId: resource.id,
                  publicIp: resource.configuration?.publicIpAddress,
                  autoAssignPublicIp: resource.configuration?.associatePublicIpAddress
                },
                recommendation: 'Use NAT Gateway or VPN for outbound connectivity instead of public IPs'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Remove public IP and use private networking',
          steps: [
            'Stop the EC2 instance',
            'Modify network settings to remove public IP',
            'Set up NAT Gateway for outbound internet access',
            'Use VPN or bastion host for administrative access'
          ],
          automatable: true
        },
        references: [
          'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html'
        ],
        complianceFrameworks: [
          { name: 'CIS AWS Foundations', requirement: '4.1', description: 'Ensure no security groups allow ingress from 0.0.0.0/0 to port 22' }
        ],
        tags: ['ec2', 'network', 'public-ip']
      },

      {
        id: 'AWS-003',
        name: 'RDS Instance Public Access',
        description: 'RDS instances should not be publicly accessible',
        severity: 'critical',
        category: 'data_protection',
        provider: 'aws',
        resourceTypes: ['aws_db_instance'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const publiclyAccessible = resource.configuration?.publiclyAccessible === true;

          if (publiclyAccessible) {
            return {
              passed: false,
              finding: {
                description: 'RDS instance is publicly accessible, exposing sensitive data to potential threats',
                evidence: {
                  dbInstanceId: resource.id,
                  publiclyAccessible: resource.configuration?.publiclyAccessible,
                  endpoint: resource.configuration?.endpoint
                },
                recommendation: 'Set publicly_accessible to false and use VPC for secure access'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Disable public access for RDS instance',
          steps: [
            'Go to RDS console',
            'Select the DB instance',
            'Choose Modify',
            'Under Connectivity, set Public access to No',
            'Apply changes immediately or during maintenance window'
          ],
          automatable: true
        },
        references: [
          'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html'
        ],
        complianceFrameworks: [
          { name: 'CIS AWS Foundations', requirement: '2.3.1', description: 'Ensure RDS instances are not publicly accessible' },
          { name: 'PCI DSS', requirement: '1.3', description: 'Prohibit direct public access between Internet and cardholder data environment' }
        ],
        tags: ['rds', 'database', 'public-access']
      },

      {
        id: 'AWS-004',
        name: 'Security Group SSH Access',
        description: 'Security groups should not allow SSH access from 0.0.0.0/0',
        severity: 'high',
        category: 'network_security',
        provider: 'aws',
        resourceTypes: ['aws_security_group'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const sshRules = resource.configuration?.ipPermissions?.filter((rule: any) =>
            (rule.fromPort === 22 || rule.toPort === 22) &&
            rule.ipRanges?.some((range: any) => range.cidrIp === '0.0.0.0/0')
          );

          if (sshRules?.length > 0) {
            return {
              passed: false,
              finding: {
                description: 'Security group allows SSH access from anywhere on the internet',
                evidence: {
                  securityGroupId: resource.id,
                  sshRules: sshRules
                },
                recommendation: 'Restrict SSH access to specific IP ranges or use Session Manager'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Restrict SSH access to specific IP ranges',
          steps: [
            'Go to EC2 console',
            'Navigate to Security Groups',
            'Select the security group',
            'Edit inbound rules',
            'Change SSH source from 0.0.0.0/0 to specific IP ranges'
          ],
          automatable: true
        },
        references: [
          'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html'
        ],
        complianceFrameworks: [
          { name: 'CIS AWS Foundations', requirement: '4.1', description: 'Ensure no security groups allow ingress from 0.0.0.0/0 to port 22' }
        ],
        tags: ['security-group', 'ssh', 'network']
      },

      {
        id: 'AWS-005',
        name: 'CloudTrail Encryption',
        description: 'CloudTrail logs should be encrypted at rest',
        severity: 'medium',
        category: 'encryption',
        provider: 'aws',
        resourceTypes: ['aws_cloudtrail'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const encrypted = resource.configuration?.kmsKeyId;

          if (!encrypted) {
            return {
              passed: false,
              finding: {
                description: 'CloudTrail logs are not encrypted at rest',
                evidence: {
                  trailName: resource.name,
                  kmsKeyId: resource.configuration?.kmsKeyId
                },
                recommendation: 'Enable KMS encryption for CloudTrail logs'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Enable KMS encryption for CloudTrail',
          steps: [
            'Go to CloudTrail console',
            'Select the trail',
            'Under Storage location, check "Encrypt log files with SSE-KMS"',
            'Select or create a KMS key',
            'Save changes'
          ],
          automatable: true
        },
        references: [
          'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/encrypting-cloudtrail-log-files-with-aws-kms.html'
        ],
        complianceFrameworks: [
          { name: 'CIS AWS Foundations', requirement: '2.7', description: 'Ensure CloudTrail logs are encrypted at rest using KMS CMKs' }
        ],
        tags: ['cloudtrail', 'encryption', 'logging']
      }
    ];
  }

  private static getAzureRules(): SecurityRule[] {
    return [
      {
        id: 'AZURE-001',
        name: 'Storage Account Public Access',
        description: 'Storage accounts should not allow public blob access',
        severity: 'critical',
        category: 'access_control',
        provider: 'azure',
        resourceTypes: ['azurerm_storage_account'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const allowBlobPublicAccess = resource.configuration?.allowBlobPublicAccess !== false;

          if (allowBlobPublicAccess) {
            return {
              passed: false,
              finding: {
                description: 'Storage account allows public blob access',
                evidence: {
                  storageAccountName: resource.name,
                  allowBlobPublicAccess: resource.configuration?.allowBlobPublicAccess
                },
                recommendation: 'Disable public blob access and use SAS tokens or AAD authentication'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Disable public blob access',
          steps: [
            'Go to Azure Portal',
            'Navigate to Storage Accounts',
            'Select the storage account',
            'Under Settings, click Configuration',
            'Set "Allow Blob public access" to Disabled'
          ],
          automatable: true
        },
        references: [
          'https://docs.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-prevent'
        ],
        complianceFrameworks: [
          { name: 'CIS Azure Foundations', requirement: '3.1', description: 'Ensure that "Secure transfer required" is set to "Enabled"' }
        ],
        tags: ['storage', 'public-access', 'blob']
      },

      {
        id: 'AZURE-002',
        name: 'Network Security Group SSH Access',
        description: 'Network Security Groups should not allow SSH access from internet',
        severity: 'high',
        category: 'network_security',
        provider: 'azure',
        resourceTypes: ['azurerm_network_security_group'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const sshRules = resource.configuration?.securityRules?.filter((rule: any) =>
            rule.access === 'Allow' &&
            rule.direction === 'Inbound' &&
            rule.destinationPortRange === '22' &&
            (rule.sourceAddressPrefix === '*' || rule.sourceAddressPrefix === 'Internet')
          );

          if (sshRules?.length > 0) {
            return {
              passed: false,
              finding: {
                description: 'Network Security Group allows SSH access from internet',
                evidence: {
                  nsgName: resource.name,
                  sshRules: sshRules
                },
                recommendation: 'Restrict SSH access to specific IP ranges'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Restrict SSH access in NSG rules',
          steps: [
            'Go to Azure Portal',
            'Navigate to Network Security Groups',
            'Select the NSG',
            'Click on Inbound security rules',
            'Modify or delete rules allowing SSH from internet'
          ],
          automatable: true
        },
        references: [
          'https://docs.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview'
        ],
        complianceFrameworks: [
          { name: 'CIS Azure Foundations', requirement: '6.1', description: 'Ensure that RDP access is restricted from the internet' }
        ],
        tags: ['nsg', 'ssh', 'network-security']
      }
    ];
  }

  private static getGCPRules(): SecurityRule[] {
    return [
      {
        id: 'GCP-001',
        name: 'Compute Instance Public IP',
        description: 'Compute instances should not have external IP addresses unless necessary',
        severity: 'medium',
        category: 'network_security',
        provider: 'gcp',
        resourceTypes: ['google_compute_instance'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const hasExternalIP = resource.configuration?.networkInterfaces?.some((ni: any) =>
            ni.accessConfigs?.length > 0
          );

          if (hasExternalIP) {
            return {
              passed: false,
              finding: {
                description: 'Compute instance has external IP address',
                evidence: {
                  instanceName: resource.name,
                  networkInterfaces: resource.configuration?.networkInterfaces
                },
                recommendation: 'Remove external IP and use Cloud NAT for outbound connectivity'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Remove external IP from compute instance',
          steps: [
            'Go to Compute Engine console',
            'Select the instance',
            'Click Edit',
            'Under Network interfaces, click the interface',
            'Set External IP to None'
          ],
          automatable: true
        },
        references: [
          'https://cloud.google.com/compute/docs/ip-addresses'
        ],
        complianceFrameworks: [
          { name: 'CIS GCP Foundations', requirement: '4.1', description: 'Ensure that instances are not configured to use the default service account' }
        ],
        tags: ['compute', 'external-ip', 'network']
      }
    ];
  }

  private static getMultiCloudRules(): SecurityRule[] {
    return [
      {
        id: 'MULTI-001',
        name: 'Unencrypted Storage',
        description: 'Storage resources should be encrypted at rest',
        severity: 'high',
        category: 'encryption',
        provider: '*',
        resourceTypes: ['*_storage*', '*_bucket*', '*_disk*'],
        enabled: true,
        check: async (resource: any, context: SecurityScanContext): Promise<SecurityRuleResult> => {
          const encryptionFields = ['encrypted', 'encryption', 'kmsKeyId', 'serverSideEncryption'];
          const isEncrypted = encryptionFields.some(field =>
            resource.configuration?.[field] === true ||
            (typeof resource.configuration?.[field] === 'object' && resource.configuration[field] !== null)
          );

          if (!isEncrypted) {
            return {
              passed: false,
              finding: {
                description: 'Storage resource is not encrypted at rest',
                evidence: {
                  resourceName: resource.name,
                  resourceType: resource.type,
                  encryptionStatus: 'disabled'
                },
                recommendation: 'Enable encryption at rest using provider-managed or customer-managed keys'
              }
            };
          }

          return { passed: true };
        },
        remediation: {
          description: 'Enable encryption at rest',
          steps: [
            'Navigate to the resource configuration',
            'Enable encryption settings',
            'Choose appropriate encryption key management',
            'Apply changes'
          ],
          automatable: true
        },
        references: [
          'https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html',
          'https://docs.microsoft.com/en-us/azure/storage/common/storage-service-encryption',
          'https://cloud.google.com/storage/docs/encryption'
        ],
        complianceFrameworks: [
          { name: 'SOC 2', requirement: 'CC6.1', description: 'Data encryption' },
          { name: 'PCI DSS', requirement: '3.4', description: 'Protect stored cardholder data' }
        ],
        tags: ['encryption', 'storage', 'data-protection']
      }
    ];
  }

  static getRuleById(id: string): SecurityRule | undefined {
    return this.getAllRules().find(rule => rule.id === id);
  }

  static getRulesByProvider(provider: string): SecurityRule[] {
    return this.getAllRules().filter(rule => rule.provider === provider || rule.provider === '*');
  }

  static getRulesByCategory(category: SecurityCategory): SecurityRule[] {
    return this.getAllRules().filter(rule => rule.category === category);
  }

  static getRulesBySeverity(severity: SecuritySeverity): SecurityRule[] {
    return this.getAllRules().filter(rule => rule.severity === severity);
  }
}