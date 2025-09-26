/**
 * Security Scan Reporting
 * Generate comprehensive security scan reports in various formats
 */

import { SecurityScanResult, SecurityVulnerability, SecuritySeverity } from './types';
import { writeFileSync } from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export class SecurityReporter {
  static generateReport(result: SecurityScanResult, format: string, outputPath?: string): string {
    switch (format.toLowerCase()) {
      case 'json':
        return this.generateJSON(result, outputPath);
      case 'html':
        return this.generateHTML(result, outputPath);
      case 'csv':
        return this.generateCSV(result, outputPath);
      case 'sarif':
        return this.generateSARIF(result, outputPath);
      case 'junit':
        return this.generateJUnit(result, outputPath);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private static generateJSON(result: SecurityScanResult, outputPath?: string): string {
    const jsonContent = JSON.stringify(result, null, 2);

    if (outputPath) {
      writeFileSync(outputPath, jsonContent);
    }

    return jsonContent;
  }

  private static generateHTML(result: SecurityScanResult, outputPath?: string): string {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Scan Report - ${result.provider.toUpperCase()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e1e8ed; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #1a1a1a; font-size: 28px; font-weight: 600; margin: 0; }
        .subtitle { color: #666; font-size: 16px; margin: 10px 0 0 0; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #3b82f6; }
        .metric-value { font-size: 32px; font-weight: 700; color: #1e293b; margin: 0; }
        .metric-label { color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 5px; }
        .severity-critical { border-left-color: #dc2626; }
        .severity-high { border-left-color: #ea580c; }
        .severity-medium { border-left-color: #d97706; }
        .severity-low { border-left-color: #65a30d; }
        .section { margin-bottom: 40px; }
        .section-title { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 15px; border-bottom: 1px solid #e1e8ed; padding-bottom: 10px; }
        .vulnerability { background: white; border: 1px solid #e1e8ed; border-radius: 6px; margin-bottom: 15px; overflow: hidden; }
        .vuln-header { padding: 15px 20px; display: flex; justify-content: between; align-items: center; background: #f8fafc; }
        .vuln-title { font-weight: 600; color: #1a1a1a; margin: 0; }
        .vuln-severity { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .vuln-severity.critical { background: #fef2f2; color: #dc2626; }
        .vuln-severity.high { background: #fff7ed; color: #ea580c; }
        .vuln-severity.medium { background: #fefce8; color: #d97706; }
        .vuln-severity.low { background: #f0fdf4; color: #65a30d; }
        .vuln-body { padding: 20px; }
        .vuln-description { color: #374151; line-height: 1.6; margin-bottom: 15px; }
        .vuln-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .detail-item { background: #f8fafc; padding: 12px; border-radius: 4px; }
        .detail-label { font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { color: #1f2937; margin-top: 4px; }
        .recommendation { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 15px; margin-top: 15px; }
        .recommendation-title { font-weight: 600; color: #065f46; margin: 0 0 8px 0; }
        .recommendation-text { color: #047857; margin: 0; }
        .posture-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; text-transform: uppercase; }
        .posture-excellent { background: #dcfce7; color: #166534; }
        .posture-good { background: #dbeafe; color: #1d4ed8; }
        .posture-fair { background: #fef3c7; color: #92400e; }
        .posture-poor { background: #fed7d7; color: #c53030; }
        .posture-critical { background: #fee2e2; color: #dc2626; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Security Scan Report</h1>
            <p class="subtitle">Generated on ${result.timestamp.toLocaleString()} | Provider: ${result.provider.toUpperCase()} | Scan Duration: ${(result.scanDuration / 1000).toFixed(2)}s</p>
        </div>

        <div class="section">
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${result.totalVulnerabilities}</div>
                    <div class="metric-label">Total Vulnerabilities</div>
                </div>
                <div class="metric severity-critical">
                    <div class="metric-value">${result.severityBreakdown.critical}</div>
                    <div class="metric-label">Critical</div>
                </div>
                <div class="metric severity-high">
                    <div class="metric-value">${result.severityBreakdown.high}</div>
                    <div class="metric-label">High</div>
                </div>
                <div class="metric severity-medium">
                    <div class="metric-value">${result.severityBreakdown.medium}</div>
                    <div class="metric-label">Medium</div>
                </div>
                <div class="metric severity-low">
                    <div class="metric-value">${result.severityBreakdown.low}</div>
                    <div class="metric-label">Low</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Security Posture</h2>
            <div style="margin-bottom: 15px;">
                <span class="posture-badge posture-${result.summary.securityPosture}">${result.summary.securityPosture.toUpperCase()}</span>
                <span style="margin-left: 15px; color: #64748b;">Risk Score: ${result.summary.riskScore}/100</span>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <strong>Resources Scanned:</strong> ${result.resources.scanned}
                    </div>
                    <div>
                        <strong>Vulnerable Resources:</strong> ${result.resources.vulnerable}
                    </div>
                    <div>
                        <strong>Compliance Rate:</strong> ${Math.round((result.resources.compliant / result.resources.scanned) * 100)}%
                    </div>
                </div>
            </div>
        </div>

        ${result.summary.criticalFindings.length > 0 ? `
        <div class="section">
            <h2 class="section-title">Critical Findings (${result.summary.criticalFindings.length})</h2>
            ${result.summary.criticalFindings.map(vuln => this.generateVulnerabilityHTML(vuln)).join('')}
        </div>
        ` : ''}

        ${result.vulnerabilities.length > 0 ? `
        <div class="section">
            <h2 class="section-title">All Vulnerabilities (${result.vulnerabilities.length})</h2>
            ${result.vulnerabilities.map(vuln => this.generateVulnerabilityHTML(vuln)).join('')}
        </div>
        ` : ''}

        ${Object.keys(result.complianceStatus).length > 0 ? `
        <div class="section">
            <h2 class="section-title">Compliance Status</h2>
            ${Object.entries(result.complianceStatus).map(([framework, status]) => `
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                    <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">${framework}</h3>
                    <div style="display: flex; gap: 20px;">
                        <div>Score: <strong>${status.score}%</strong></div>
                        <div>Passed: <strong>${status.passedChecks}</strong></div>
                        <div>Failed: <strong>${status.failedChecks}</strong></div>
                        <div>Total: <strong>${status.totalChecks}</strong></div>
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="section">
            <h2 class="section-title">Scan Metadata</h2>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div><strong>Scanner:</strong> ${result.metadata.scanner}</div>
                    <div><strong>Version:</strong> ${result.metadata.version}</div>
                    <div><strong>Rules Used:</strong> ${result.metadata.rules.enabled}/${result.metadata.rules.total}</div>
                    <div><strong>Regions:</strong> ${result.regions.join(', ')}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    if (outputPath) {
      writeFileSync(outputPath, htmlContent);
    }

    return htmlContent;
  }

  private static generateVulnerabilityHTML(vuln: SecurityVulnerability): string {
    return `
        <div class="vulnerability">
            <div class="vuln-header">
                <h3 class="vuln-title">${vuln.title}</h3>
                <span class="vuln-severity ${vuln.severity}">${vuln.severity}</span>
            </div>
            <div class="vuln-body">
                <p class="vuln-description">${vuln.description}</p>
                <div class="vuln-details">
                    <div class="detail-item">
                        <div class="detail-label">Resource</div>
                        <div class="detail-value">${vuln.resourceName || vuln.resourceId}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Type</div>
                        <div class="detail-value">${vuln.resourceType}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Region</div>
                        <div class="detail-value">${vuln.region || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Category</div>
                        <div class="detail-value">${vuln.category.replace(/_/g, ' ').toUpperCase()}</div>
                    </div>
                </div>
                <div class="recommendation">
                    <h4 class="recommendation-title">💡 Recommendation</h4>
                    <p class="recommendation-text">${vuln.recommendation}</p>
                </div>
            </div>
        </div>`;
  }

  private static generateCSV(result: SecurityScanResult, outputPath?: string): string {
    const headers = [
      'Vulnerability ID',
      'Title',
      'Severity',
      'Category',
      'Resource ID',
      'Resource Type',
      'Resource Name',
      'Region',
      'Provider',
      'Description',
      'Recommendation',
      'Status',
      'First Detected'
    ];

    const rows = result.vulnerabilities.map(vuln => [
      vuln.id,
      vuln.title,
      vuln.severity,
      vuln.category,
      vuln.resourceId,
      vuln.resourceType,
      vuln.resourceName || '',
      vuln.region || '',
      vuln.provider,
      vuln.description.replace(/"/g, '""'),
      vuln.recommendation.replace(/"/g, '""'),
      vuln.status,
      vuln.firstDetected.toISOString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    if (outputPath) {
      writeFileSync(outputPath, csvContent);
    }

    return csvContent;
  }

  private static generateSARIF(result: SecurityScanResult, outputPath?: string): string {
    const sarifReport = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: result.metadata.scanner,
              version: result.metadata.version,
              informationUri: 'https://optimisely.ai',
              rules: result.vulnerabilities.map(vuln => ({
                id: vuln.id.split('_')[0], // Get rule ID
                shortDescription: {
                  text: vuln.title
                },
                fullDescription: {
                  text: vuln.description
                },
                help: {
                  text: vuln.recommendation
                },
                properties: {
                  category: vuln.category,
                  severity: vuln.severity
                }
              }))
            }
          },
          results: result.vulnerabilities.map(vuln => ({
            ruleId: vuln.id.split('_')[0],
            level: this.getSarifLevel(vuln.severity),
            message: {
              text: vuln.description
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: vuln.resourceId
                  },
                  region: {
                    startLine: 1,
                    startColumn: 1
                  }
                }
              }
            ],
            properties: {
              resourceType: vuln.resourceType,
              resourceName: vuln.resourceName,
              region: vuln.region,
              provider: vuln.provider,
              category: vuln.category,
              recommendation: vuln.recommendation
            }
          }))
        }
      ]
    };

    const sarifContent = JSON.stringify(sarifReport, null, 2);

    if (outputPath) {
      writeFileSync(outputPath, sarifContent);
    }

    return sarifContent;
  }

  private static generateJUnit(result: SecurityScanResult, outputPath?: string): string {
    const testSuites = result.vulnerabilities.reduce((suites: any, vuln) => {
      const suiteName = vuln.category;
      if (!suites[suiteName]) {
        suites[suiteName] = [];
      }
      suites[suiteName].push(vuln);
      return suites;
    }, {});

    const junitContent = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="SecurityScan" tests="${result.totalVulnerabilities}" failures="${result.totalVulnerabilities}" time="${(result.scanDuration / 1000).toFixed(3)}">
${Object.entries(testSuites).map(([suiteName, vulnerabilities]: [string, any]) => `
  <testsuite name="${suiteName}" tests="${vulnerabilities.length}" failures="${vulnerabilities.length}" time="0">
${vulnerabilities.map((vuln: SecurityVulnerability) => `
    <testcase name="${vuln.title}" classname="${vuln.resourceType}">
      <failure message="${vuln.description}" type="${vuln.severity}">
Resource: ${vuln.resourceName || vuln.resourceId}
Type: ${vuln.resourceType}
Region: ${vuln.region || 'N/A'}
Recommendation: ${vuln.recommendation}
      </failure>
    </testcase>`).join('')}
  </testsuite>`).join('')}
</testsuites>`;

    if (outputPath) {
      writeFileSync(outputPath, junitContent);
    }

    return junitContent;
  }

  private static getSarifLevel(severity: SecuritySeverity): string {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'note';
      default:
        return 'note';
    }
  }

  static printConsoleSummary(result: SecurityScanResult): void {

    console.log(chalk.blue('\n🔒 Security Scan Results Summary:'));
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    // Basic stats
    console.log(chalk.white(`📅 Scan Date: ${result.timestamp.toLocaleString()}`));
    console.log(chalk.white(`☁️  Provider: ${result.provider.toUpperCase()}`));
    console.log(chalk.white(`🌍 Regions: ${result.regions.join(', ')}`));
    console.log(chalk.white(`⏱️  Duration: ${(result.scanDuration / 1000).toFixed(2)}s`));
    console.log(chalk.white(`📊 Resources Scanned: ${result.resources.scanned}`));

    // Security posture
    const postureColors = {
      excellent: chalk.green,
      good: chalk.blue,
      fair: chalk.yellow,
      poor: chalk.red,
      critical: chalk.redBright
    };

    console.log(`\n🛡️  Security Posture: ${postureColors[result.summary.securityPosture](result.summary.securityPosture.toUpperCase())} (Risk Score: ${result.summary.riskScore}/100)`);

    // Vulnerability breakdown
    console.log('\n🚨 Vulnerability Summary:');
    console.log(`   Total: ${chalk.bold(result.totalVulnerabilities)}`);
    console.log(`   ${chalk.redBright('Critical')}: ${result.severityBreakdown.critical}`);
    console.log(`   ${chalk.red('High')}: ${result.severityBreakdown.high}`);
    console.log(`   ${chalk.yellow('Medium')}: ${result.severityBreakdown.medium}`);
    console.log(`   ${chalk.green('Low')}: ${result.severityBreakdown.low}`);

    // Critical findings
    if (result.summary.criticalFindings.length > 0) {
      console.log(chalk.redBright(`\n🚨 Critical Findings (${result.summary.criticalFindings.length}):`));
      result.summary.criticalFindings.slice(0, 5).forEach((vuln, index) => {
        console.log(`   ${index + 1}. ${chalk.red(vuln.title)} - ${vuln.resourceName || vuln.resourceId}`);
      });
      if (result.summary.criticalFindings.length > 5) {
        console.log(`   ... and ${result.summary.criticalFindings.length - 5} more critical findings`);
      }
    }

    // Quick wins
    if (result.summary.quickWins.length > 0) {
      console.log(chalk.green(`\n💡 Quick Wins (${result.summary.quickWins.length}):`));
      result.summary.quickWins.slice(0, 3).forEach((vuln, index) => {
        console.log(`   ${index + 1}. ${vuln.title} - ${chalk.gray(vuln.resourceName || vuln.resourceId)}`);
      });
    }

    // Compliance status
    if (Object.keys(result.complianceStatus).length > 0) {
      console.log('\n📋 Compliance Status:');
      Object.entries(result.complianceStatus).forEach(([framework, status]) => {
        const scoreColor = status.score >= 80 ? chalk.green :
                          status.score >= 60 ? chalk.yellow :
                          chalk.red;
        console.log(`   ${framework}: ${scoreColor(status.score + '%')} (${status.passedChecks}/${status.totalChecks} checks passed)`);
      });
    }

    console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  }
}