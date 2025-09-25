/**
 * Terraform Generator for Optimisely Cloud SDK
 * Generates Infrastructure as Code from scanned cloud resources
 */

import { ScanResult, CloudResource } from '../types';
import { generateAWSTerraform } from './aws-generator';
import { generateAzureTerraform } from './azure-generator';
import { generateGCPTerraform } from './gcp-generator';

export interface TerraformOptions {
  provider: 'aws' | 'azure' | 'gcp';
  outputDir?: string;
  includeState?: boolean;
  modules?: boolean;
  optimized?: boolean;
  variables?: boolean;
  outputs?: boolean;
}

export interface TerraformOutput {
  mainTf: string;
  variablesTf?: string;
  outputsTf?: string;
  providerTf: string;
  terraformTfvars?: string;
  modules?: { [key: string]: string };
}

/**
 * Generate Terraform configuration from scan results
 */
export async function generateTerraform(
  scanResult: ScanResult,
  options: TerraformOptions
): Promise<TerraformOutput> {

  switch (options.provider) {
    case 'aws':
      return await generateAWSTerraform(scanResult, options);
    case 'azure':
      return await generateAzureTerraform(scanResult, options);
    case 'gcp':
      return await generateGCPTerraform(scanResult, options);
    default:
      throw new Error(`Unsupported provider for Terraform generation: ${options.provider}`);
  }
}

/**
 * Generate resource tags for Terraform
 */
export function generateResourceTags(resource: CloudResource, includeOptimisely: boolean = true): string {
  const tags: { [key: string]: string } = { ...resource.tags };

  if (includeOptimisely) {
    tags['GeneratedBy'] = 'optimisely-cloud-sdk';
    tags['GeneratedAt'] = new Date().toISOString();
    tags['OriginalId'] = resource.id;
  }

  const tagEntries = Object.entries(tags).map(([key, value]) =>
    `    ${key} = "${value}"`
  ).join('\n');

  return tagEntries ? `\n  tags = {\n${tagEntries}\n  }` : '';
}

/**
 * Sanitize resource names for Terraform
 */
export function sanitizeResourceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '_')
    .replace(/^[0-9]/, 'r$&')  // Prefix with 'r' if starts with number
    .replace(/^-+|-+$/g, '')   // Remove leading/trailing dashes
    .substring(0, 63);         // AWS resource name limit
}

/**
 * Generate Terraform variable definition
 */
export function generateVariable(name: string, description: string, type: string = 'string', defaultValue?: any): string {
  let variable = `variable "${name}" {
  description = "${description}"
  type        = ${type}`;

  if (defaultValue !== undefined) {
    const value = typeof defaultValue === 'string' ? `"${defaultValue}"` : JSON.stringify(defaultValue);
    variable += `\n  default     = ${value}`;
  }

  variable += '\n}\n';
  return variable;
}

/**
 * Generate Terraform output definition
 */
export function generateOutput(name: string, value: string, description: string, sensitive: boolean = false): string {
  return `output "${name}" {
  description = "${description}"
  value       = ${value}${sensitive ? '\n  sensitive   = true' : ''}
}
`;
}