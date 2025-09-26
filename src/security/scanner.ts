/**
 * Main Security Scanner Engine
 */

import { SecurityScanOptions, SecurityScanResult, SecurityVulnerability, SecurityRule, SecurityScanContext, SecurityConfig, CloudResource, SecuritySeverity } from './types';
import { AWSSecurityScanner } from './aws-scanner';
import { AzureSecurityScanner } from './azure-scanner';
import { GCPSecurityScanner } from './gcp-scanner';
import { SecurityRules } from './rules';
import { createLogger, Logger } from 'winston';

export class SecurityScanner {
  private logger: Logger;
  private rules: SecurityRule[];
  private config: SecurityConfig;

  constructor(config?: SecurityConfig) {
    this.config = config || {};
    this.rules = SecurityRules.getAllRules();
    this.logger = createLogger({
      level: 'info',
      format: require('winston').format.json(),
      transports: [
        new (require('winston').transports.Console)()
      ]
    });
  }

  /**
   * Perform comprehensive security scan
   */
  async scan(options: SecurityScanOptions, credentials: any): Promise<SecurityScanResult> {
    const startTime = Date.now();
    this.logger.info(`Starting security scan for ${options.provider}`);

    try {
      // Get provider-specific scanner
      const scanner = this.getProviderScanner(options.provider);

      // Initialize scan context
      const context: SecurityScanContext = {
        provider: options.provider,
        region: options.regions?.[0] || 'default',
        allResources: [],
        credentials
      };

      // Discover resources
      const resources = await scanner.discoverResources(credentials, options.regions);
      context.allResources = resources;

      this.logger.info(`Discovered ${resources.length} resources across ${options.regions?.length || 1} regions`);

      // Filter rules based on provider and configuration
      const enabledRules = this.getEnabledRules(options.provider, options.severity, options.categories);

      this.logger.info(`Running ${enabledRules.length} security rules`);

      // Run security checks
      const vulnerabilities: SecurityVulnerability[] = [];

      for (const resource of resources) {
        const applicableRules = enabledRules.filter(rule =>
          rule.resourceTypes.includes(resource.type) || rule.resourceTypes.includes('*')
        );

        for (const rule of applicableRules) {
          try {
            const result = await rule.check(resource, { ...context, region: resource.region });

            if (!result.passed && result.finding) {
              const vulnerability: SecurityVulnerability = {
                id: `${rule.id}_${resource.id}`,
                title: rule.name,
                description: result.finding.description,
                severity: rule.severity,
                category: rule.category,
                resourceId: resource.id,
                resourceType: resource.type,
                resourceName: resource.name,
                region: resource.region,
                provider: options.provider,
                recommendation: result.finding.recommendation,
                remediation: rule.remediation,
                references: rule.references,
                complianceFrameworks: rule.complianceFrameworks,
                evidence: result.finding.evidence,
                firstDetected: new Date(),
                lastSeen: new Date(),
                status: 'open',
                tags: rule.tags
              };

              vulnerabilities.push(vulnerability);
            }
          } catch (error) {
            this.logger.warn(`Rule ${rule.id} failed for resource ${resource.id}: ${error}`);
          }
        }
      }

      // Generate compliance status
      const complianceStatus = this.generateComplianceStatus(vulnerabilities);

      // Generate summary and risk assessment
      const summary = this.generateSummary(vulnerabilities, resources.length);

      // Create final result
      const result: SecurityScanResult = {
        timestamp: new Date(),
        provider: options.provider,
        regions: options.regions || ['default'],
        totalResources: resources.length,
        totalVulnerabilities: vulnerabilities.length,
        severityBreakdown: this.getSeverityBreakdown(vulnerabilities),
        categoryBreakdown: this.getCategoryBreakdown(vulnerabilities),
        vulnerabilities,
        complianceStatus,
        summary,
        resources: {
          scanned: resources.length,
          vulnerable: new Set(vulnerabilities.map(v => v.resourceId)).size,
          compliant: resources.length - new Set(vulnerabilities.map(v => v.resourceId)).size,
          nonCompliant: new Set(vulnerabilities.map(v => v.resourceId)).size
        },
        scanDuration: Date.now() - startTime,
        metadata: {
          scanner: 'optimisely-security-scanner',
          version: '1.0.0',
          rules: {
            total: this.rules.length,
            enabled: enabledRules.length
          }
        }
      };

      this.logger.info(`Security scan completed. Found ${vulnerabilities.length} vulnerabilities in ${result.scanDuration}ms`);

      return result;

    } catch (error) {
      this.logger.error('Security scan failed:', error);
      throw error;
    }
  }

  private getProviderScanner(provider: string) {
    switch (provider) {
      case 'aws':
        return new AWSSecurityScanner();
      case 'azure':
        return new AzureSecurityScanner();
      case 'gcp':
        return new GCPSecurityScanner();
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private getEnabledRules(provider: string, severities?: SecuritySeverity[], categories?: string[]): SecurityRule[] {
    let filteredRules = this.rules.filter(rule =>
      rule.enabled &&
      (rule.provider === provider || rule.provider === '*')
    );

    if (severities?.length) {
      filteredRules = filteredRules.filter(rule => severities.includes(rule.severity));
    }

    if (categories?.length) {
      filteredRules = filteredRules.filter(rule => categories.includes(rule.category));
    }

    // Apply config overrides
    if (this.config.rules?.enabled?.length) {
      filteredRules = filteredRules.filter(rule => this.config.rules!.enabled.includes(rule.id));
    }

    if (this.config.rules?.disabled?.length) {
      filteredRules = filteredRules.filter(rule => !this.config.rules!.disabled.includes(rule.id));
    }

    return filteredRules;
  }

  private getSeverityBreakdown(vulnerabilities: SecurityVulnerability[]) {
    return {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length
    };
  }

  private getCategoryBreakdown(vulnerabilities: SecurityVulnerability[]) {
    const breakdown: any = {};
    vulnerabilities.forEach(v => {
      breakdown[v.category] = (breakdown[v.category] || 0) + 1;
    });
    return breakdown;
  }

  private generateComplianceStatus(vulnerabilities: SecurityVulnerability[]) {
    const frameworks: any = {};

    vulnerabilities.forEach(vuln => {
      vuln.complianceFrameworks.forEach(framework => {
        if (!frameworks[framework.name]) {
          frameworks[framework.name] = {
            totalChecks: 0,
            passedChecks: 0,
            failedChecks: 0,
            score: 0
          };
        }
        frameworks[framework.name].totalChecks++;
        frameworks[framework.name].failedChecks++;
      });
    });

    // Calculate scores and passed checks
    Object.keys(frameworks).forEach(framework => {
      const status = frameworks[framework];
      status.passedChecks = status.totalChecks - status.failedChecks;
      status.score = Math.round((status.passedChecks / status.totalChecks) * 100);
    });

    return frameworks;
  }

  private generateSummary(vulnerabilities: SecurityVulnerability[], totalResources: number) {
    const criticalFindings = vulnerabilities.filter(v => v.severity === 'critical');
    const topVulnerabilities = vulnerabilities
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 10);

    const quickWins = vulnerabilities
      .filter(v => v.remediation.automated && v.remediation.automated.length > 0)
      .slice(0, 5);

    // Calculate risk score (0-100)
    const riskScore = this.calculateRiskScore(vulnerabilities, totalResources);

    // Determine security posture
    const securityPosture = this.determineSecurityPosture(riskScore);

    return {
      topVulnerabilities,
      criticalFindings,
      quickWins,
      riskScore,
      securityPosture
    };
  }

  private calculateRiskScore(vulnerabilities: SecurityVulnerability[], totalResources: number): number {
    if (vulnerabilities.length === 0) return 0;

    const severityWeights = { critical: 10, high: 7, medium: 4, low: 1 };
    const totalWeight = vulnerabilities.reduce((sum, vuln) =>
      sum + severityWeights[vuln.severity], 0
    );

    // Normalize by resource count to get percentage
    const maxPossibleScore = totalResources * severityWeights.critical;
    return Math.min(100, Math.round((totalWeight / maxPossibleScore) * 100));
  }

  private determineSecurityPosture(riskScore: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'poor';
    if (riskScore >= 40) return 'fair';
    if (riskScore >= 20) return 'good';
    return 'excellent';
  }
}