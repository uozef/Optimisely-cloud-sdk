# Security Vulnerability Scanning

The Optimisely Cloud SDK now includes comprehensive security vulnerability scanning capabilities for cloud infrastructure across AWS, Azure, and GCP.

## Features

- **Multi-Cloud Support**: Scan AWS, Azure, and GCP resources
- **Comprehensive Rule Set**: 100+ security rules covering major compliance frameworks
- **Multiple Output Formats**: JSON, HTML, CSV, SARIF, JUnit
- **Compliance Frameworks**: CIS Foundations, SOC 2, PCI DSS, and more
- **Risk Assessment**: Automated risk scoring and security posture evaluation
- **Actionable Recommendations**: Detailed remediation steps with Terraform code
- **CI/CD Integration**: Exit codes and formats suitable for automation

## Quick Start

### Basic Security Scan

```bash
# Scan AWS infrastructure
optimisely security --provider aws --regions us-east-1,us-west-2

# Scan with specific severity filter
optimisely security --provider aws --severity critical,high

# Generate HTML report
optimisely security --provider aws --format html --output security-report.html
```

### Advanced Usage

```bash
# Comprehensive scan with compliance analysis
optimisely security \
  --provider aws \
  --regions us-east-1,us-west-2,eu-west-1 \
  --severity critical,high,medium \
  --categories access_control,network_security,data_protection \
  --include-compliance \
  --format html \
  --output detailed-security-report.html \
  --verbose

# CI/CD Integration with SARIF output
optimisely security \
  --provider aws \
  --format sarif \
  --output security-results.sarif \
  --config security-config.json
```

## Security Rules

### AWS Rules

- **AWS-001**: S3 Bucket Public Read Access
- **AWS-002**: EC2 Instance Public IP
- **AWS-003**: RDS Instance Public Access
- **AWS-004**: Security Group SSH Access
- **AWS-005**: CloudTrail Encryption
- And many more...

### Azure Rules

- **AZURE-001**: Storage Account Public Access
- **AZURE-002**: Network Security Group SSH Access
- And many more...

### GCP Rules

- **GCP-001**: Compute Instance Public IP
- And many more...

### Multi-Cloud Rules

- **MULTI-001**: Unencrypted Storage
- And many more...

## Security Categories

1. **Access Control**: IAM policies, public access, permissions
2. **Network Security**: Firewall rules, VPC configuration, network isolation
3. **Data Protection**: Encryption at rest/transit, backup configuration
4. **Logging & Monitoring**: Audit trails, log retention, monitoring setup
5. **Encryption**: Key management, encryption standards
6. **Configuration**: Resource configuration, security settings
7. **Compliance**: Framework-specific checks
8. **Secrets Management**: API keys, passwords, certificates
9. **Vulnerability Management**: Patch management, version control
10. **Backup & Recovery**: Data backup, disaster recovery

## Severity Levels

- **Critical**: Immediate security risk requiring urgent attention
- **High**: Significant security risk that should be addressed soon
- **Medium**: Moderate security risk for future remediation
- **Low**: Minor security improvement opportunities

## Configuration

Create a `security-config.json` file to customize scanning behavior:

```json
{
  "rules": {
    "enabled": ["AWS-001", "AWS-002", "AWS-003"],
    "disabled": ["AWS-005"],
    "customRules": []
  },
  "thresholds": {
    "critical": 0,
    "high": 5,
    "medium": 20,
    "low": 50
  },
  "compliance": {
    "frameworks": ["CIS AWS Foundations", "SOC 2", "PCI DSS"]
  },
  "reporting": {
    "includeEvidence": true,
    "includeFalsePositives": false,
    "groupBy": "severity"
  }
}
```

## Output Formats

### JSON
Standard structured output for programmatic consumption.

### HTML
Rich, interactive report with visual charts and detailed findings.

### CSV
Tabular format for spreadsheet analysis and data processing.

### SARIF
Static Analysis Results Interchange Format for security tool integration.

### JUnit
Test result format for CI/CD pipeline integration.

## Compliance Frameworks

The security scanner supports multiple compliance frameworks:

- **CIS Foundations**: Center for Internet Security benchmarks
- **SOC 2**: Service Organization Control 2
- **PCI DSS**: Payment Card Industry Data Security Standard
- **NIST**: National Institute of Standards and Technology
- **ISO 27001**: Information Security Management
- **GDPR**: General Data Protection Regulation compliance checks

## Integration Examples

### GitHub Actions

```yaml
- name: Security Scan
  run: |
    npx optimisely security \
      --provider aws \
      --format sarif \
      --output security-results.sarif

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: security-results.sarif
```

### Jenkins Pipeline

```groovy
stage('Security Scan') {
    steps {
        script {
            def exitCode = sh(
                script: 'npx optimisely security --provider aws --format junit --output security-results.xml',
                returnStatus: true
            )

            publishTestResults([
                testResultsPattern: 'security-results.xml'
            ])

            if (exitCode == 2) {
                error('Critical security vulnerabilities found!')
            }
        }
    }
}
```

### Docker Integration

```dockerfile
FROM node:18-alpine
RUN npm install -g optimisely-cloud-sdk

# Run security scan in container
RUN optimisely security --provider aws --format json
```

## Exit Codes

- **0**: No security issues found
- **1**: High severity issues found (warning)
- **2**: Critical severity issues found (error)

## Best Practices

1. **Regular Scanning**: Run security scans on every deployment
2. **Threshold Management**: Set appropriate severity thresholds for your environment
3. **Compliance Monitoring**: Enable compliance framework checks
4. **Automated Remediation**: Use provided Terraform code for quick fixes
5. **False Positive Management**: Configure exclusions for accepted risks
6. **Report Distribution**: Share HTML reports with security teams
7. **CI/CD Integration**: Fail builds on critical security issues

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure cloud credentials are properly configured
2. **Permission Denied**: Verify IAM permissions for resource discovery
3. **Rate Limiting**: Use fewer regions or implement retry logic
4. **Memory Issues**: Process large infrastructures in smaller chunks

### Debug Mode

```bash
optimisely security --provider aws --verbose
```

### Configuration Validation

```bash
# Test configuration file
optimisely security --config security-config.json --dry-run
```

## Custom Rules

You can extend the security scanner with custom rules:

```typescript
import { SecurityRule } from 'optimisely-cloud-sdk/security';

const customRule: SecurityRule = {
  id: 'CUSTOM-001',
  name: 'Custom Security Check',
  description: 'Custom security validation',
  severity: 'medium',
  category: 'configuration',
  provider: 'aws',
  resourceTypes: ['aws_instance'],
  enabled: true,
  check: async (resource, context) => {
    // Custom validation logic
    return { passed: true };
  },
  remediation: {
    description: 'Fix the issue',
    steps: ['Step 1', 'Step 2'],
    automatable: false
  },
  references: ['https://example.com/security-guide'],
  complianceFrameworks: [],
  tags: ['custom']
};
```

## Support

For issues and feature requests:
- 📧 Email: support@optimisely.ai
- 🌐 Website: https://optimisely.ai
- 📚 Documentation: https://docs.optimisely.ai

## Contributing

We welcome contributions to improve security rules and add new compliance frameworks. Please see our contributing guidelines for more information.