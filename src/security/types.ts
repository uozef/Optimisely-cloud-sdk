/**
 * Security Scanner Types
 */

export interface SecurityScanOptions {
  provider: 'aws' | 'azure' | 'gcp';
  regions?: string[];
  severity?: SecuritySeverity[];
  categories?: SecurityCategory[];
  includeCompliance?: boolean;
  outputFormat?: 'json' | 'csv' | 'html' | 'sarif' | 'junit';
  outputFile?: string;
  verbose?: boolean;
}

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export type SecurityCategory =
  | 'access_control'
  | 'network_security'
  | 'data_protection'
  | 'logging_monitoring'
  | 'encryption'
  | 'configuration'
  | 'compliance'
  | 'secrets_management'
  | 'vulnerability_management'
  | 'backup_recovery';

export interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  category: SecurityCategory;
  resourceId: string;
  resourceType: string;
  resourceName?: string;
  region?: string;
  provider: string;
  cwe?: string; // Common Weakness Enumeration
  cve?: string; // Common Vulnerabilities and Exposures
  cvss?: number; // Common Vulnerability Scoring System
  recommendation: string;
  remediation: {
    manual?: string[];
    automated?: string[];
    terraform?: string;
  };
  references: string[];
  complianceFrameworks: ComplianceFramework[];
  evidence: Record<string, any>;
  firstDetected: Date;
  lastSeen: Date;
  status: 'open' | 'acknowledged' | 'fixed' | 'false_positive';
  tags: string[];
}

export interface ComplianceFramework {
  name: string;
  requirement: string;
  description: string;
}

export interface SecurityScanResult {
  timestamp: Date;
  provider: string;
  regions: string[];
  totalResources: number;
  totalVulnerabilities: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: Record<SecurityCategory, number>;
  vulnerabilities: SecurityVulnerability[];
  complianceStatus: {
    [framework: string]: {
      totalChecks: number;
      passedChecks: number;
      failedChecks: number;
      score: number;
    };
  };
  summary: {
    topVulnerabilities: SecurityVulnerability[];
    criticalFindings: SecurityVulnerability[];
    quickWins: SecurityVulnerability[];
    riskScore: number;
    securityPosture: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  };
  resources: {
    scanned: number;
    vulnerable: number;
    compliant: number;
    nonCompliant: number;
  };
  scanDuration: number; // in milliseconds
  metadata: {
    scanner: string;
    version: string;
    rules: {
      total: number;
      enabled: number;
    };
  };
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: SecuritySeverity;
  category: SecurityCategory;
  provider: string;
  resourceTypes: string[];
  enabled: boolean;
  check: (resource: any, context: SecurityScanContext) => Promise<SecurityRuleResult>;
  remediation: {
    description: string;
    steps: string[];
    automatable: boolean;
    automated?: string[];
    terraform?: string;
  };
  references: string[];
  complianceFrameworks: ComplianceFramework[];
  tags: string[];
}

export interface SecurityRuleResult {
  passed: boolean;
  finding?: {
    description: string;
    evidence: Record<string, any>;
    recommendation: string;
  };
}

export interface SecurityScanContext {
  provider: string;
  region: string;
  accountId?: string;
  subscriptionId?: string;
  projectId?: string;
  allResources: any[];
  credentials: any;
}

export interface SecurityConfig {
  rules?: {
    enabled: string[];
    disabled: string[];
    customRules?: SecurityRule[];
  };
  thresholds?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  compliance?: {
    frameworks: string[];
  };
  reporting?: {
    includeEvidence: boolean;
    includeFalsePositives: boolean;
    groupBy: 'severity' | 'category' | 'resource';
  };
}

// Common Cloud Resources for Security Scanning
export interface CloudResource {
  id: string;
  name: string;
  type: string;
  provider: string;
  region: string;
  tags?: Record<string, string>;
  configuration: Record<string, any>;
  metadata?: Record<string, any>;
}