# CLI Usage Examples

This document provides comprehensive examples for using the Optimisely Cloud SDK CLI tool.

## Installation

```bash
# Install globally to use the CLI anywhere
npm install -g optimisely-cloud-sdk

# Or run locally
npx optimisely-cloud-sdk
```

## Configuration

### Interactive Configuration
```bash
# Configure credentials interactively
optimisely configure

# Configure specific provider
optimisely configure --provider aws
optimisely configure --provider azure
optimisely configure --provider gcp
```

### Environment Variables

**AWS:**
```bash
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_DEFAULT_REGION=us-east-1
```

**Azure:**
```bash
export AZURE_CLIENT_ID=your-client-id
export AZURE_CLIENT_SECRET=your-client-secret
export AZURE_TENANT_ID=your-tenant-id
export AZURE_SUBSCRIPTION_ID=your-subscription-id
```

**Google Cloud:**
```bash
export GCP_PROJECT_ID=your-project-id
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Basic Scanning

### Scan AWS Resources
```bash
# Basic scan
optimisely scan --provider aws --region us-east-1

# Verbose output
optimisely scan --provider aws --region us-east-1 --verbose

# Include cost analysis and optimization
optimisely scan --provider aws --region us-east-1 \
  --include-cost-analysis \
  --include-optimization
```

### Scan Azure Resources
```bash
# Scan Azure subscription
optimisely scan --provider azure

# Multiple regions
optimisely scan --provider azure \
  --include-regions eastus,westus2,westeurope
```

### Scan Google Cloud Resources
```bash
# Basic GCP scan
optimisely scan --provider gcp

# Specific resource types only
optimisely scan --provider gcp \
  --include-types compute,storage
```

## Advanced Filtering

### Include/Exclude Resource Types
```bash
# Only scan compute and storage
optimisely scan --provider aws \
  --include-types compute,storage

# Exclude network resources
optimisely scan --provider aws \
  --exclude-types network
```

### Region Filtering
```bash
# Multiple regions
optimisely scan --provider aws \
  --include-regions us-east-1,us-west-2,eu-west-1

# Exclude specific regions
optimisely scan --provider aws \
  --exclude-regions us-east-2,us-west-1
```

## Output Formats and Files

### JSON Output (Default)
```bash
# Save to file
optimisely scan --provider aws --output results.json

# Pretty print to console
optimisely scan --provider aws | jq .
```

### Table Format
```bash
# Display as table
optimisely scan --provider aws --format table

# Pipe to less for scrolling
optimisely scan --provider aws --format table | less
```

### CSV Export
```bash
# Export to CSV
optimisely scan --provider aws --format csv --output report.csv

# Use with Excel or Google Sheets
optimisely scan --provider aws --format csv > infrastructure.csv
```

## Cost Analysis

### Basic Cost Analysis
```bash
# Current costs
optimisely cost --provider aws --region us-east-1

# Save cost breakdown
optimisely cost --provider aws --output costs.json

# Multiple providers cost comparison
optimisely cost --provider aws --output aws-costs.json
optimisely cost --provider azure --output azure-costs.json
```

### Cost Optimization
```bash
# Get optimization recommendations
optimisely optimize --provider aws --severity medium

# High-impact recommendations only
optimisely optimize --provider aws --severity high

# Save recommendations
optimisely optimize --provider aws --output optimizations.json
```

## Integration Examples

### CI/CD Pipeline Integration
```bash
#!/bin/bash
# ci-scan.sh - Run in CI/CD pipeline

# Fail on errors
set -e

echo "Running cloud infrastructure scan..."

# Scan production resources
optimisely scan --provider aws --region us-east-1 \
  --include-cost-analysis \
  --include-optimization \
  --output scan-results.json

# Check for high-severity optimization opportunities
HIGH_SEVERITY=$(jq '.optimizationOpportunities[] | select(.severity == "high" or .severity == "critical") | length' scan-results.json)

if [ "$HIGH_SEVERITY" -gt 0 ]; then
  echo "❌ Found $HIGH_SEVERITY high-severity optimization opportunities"
  echo "Review the scan results and optimize resources"
  exit 1
fi

echo "✅ Infrastructure scan completed successfully"
```

### Monitoring Script
```bash
#!/bin/bash
# monitor.sh - Regular monitoring

# Daily cost monitoring
optimisely cost --provider aws --output "costs-$(date +%Y%m%d).json"

# Weekly optimization check
if [ $(date +%u) -eq 1 ]; then  # Monday
  optimisely optimize --provider aws --severity medium \
    --output "optimizations-$(date +%Y%m%d).json"
fi
```

### Slack Notifications
```bash
#!/bin/bash
# slack-notify.sh - Send scan results to Slack

SCAN_RESULT=$(optimisely scan --provider aws --include-cost-analysis 2>&1)
TOTAL_COST=$(echo "$SCAN_RESULT" | grep "Total Monthly Cost" | awk '{print $4}')

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"📊 Daily AWS Cost: $TOTAL_COST\"}" \
  "$SLACK_WEBHOOK_URL"
```

## Automation Examples

### Auto-cleanup Script
```bash
#!/bin/bash
# auto-cleanup.sh - Automated resource cleanup

# Scan for stopped instances
optimisely scan --provider aws --exclude-types network,database \
  --output temp-scan.json

# Extract stopped instances
STOPPED_INSTANCES=$(jq -r '.resources.compute[] | select(.status == "stopped") | .id' temp-scan.json)

if [ -n "$STOPPED_INSTANCES" ]; then
  echo "Found stopped instances: $STOPPED_INSTANCES"
  # Add your cleanup logic here
  # aws ec2 terminate-instances --instance-ids $STOPPED_INSTANCES
fi

rm temp-scan.json
```

### Budget Monitoring
```bash
#!/bin/bash
# budget-monitor.sh - Monitor monthly budget

MONTHLY_BUDGET=1000
CURRENT_COST=$(optimisely cost --provider aws 2>/dev/null | grep "Total Monthly Cost" | awk '{print $4}' | tr -d '$')

if (( $(echo "$CURRENT_COST > $MONTHLY_BUDGET" | bc -l) )); then
  echo "🚨 BUDGET ALERT: Current monthly cost ($${CURRENT_COST}) exceeds budget ($${MONTHLY_BUDGET})"

  # Get optimization recommendations
  optimisely optimize --provider aws --severity medium --output urgent-optimizations.json

  # Send alert (add your notification logic here)
  # mail -s "Budget Alert" admin@company.com < urgent-optimizations.json
fi
```

## Troubleshooting

### Common Issues

**Credentials not found:**
```bash
# Check environment variables
env | grep -E "(AWS|AZURE|GCP)"

# Test credentials
aws sts get-caller-identity  # For AWS
az account show              # For Azure
gcloud auth list            # For GCP
```

**Permission errors:**
```bash
# AWS - Check IAM permissions
aws iam get-user

# Azure - Check role assignments
az role assignment list --assignee your-client-id

# GCP - Check service account permissions
gcloud projects get-iam-policy your-project-id
```

**Network connectivity:**
```bash
# Test API connectivity
curl -I https://ec2.amazonaws.com    # AWS
curl -I https://management.azure.com # Azure
curl -I https://compute.googleapis.com # GCP
```

### Debug Mode
```bash
# Enable verbose logging
optimisely scan --provider aws --verbose

# Check version
optimisely --version

# Get help
optimisely --help
optimisely scan --help
```

## Best Practices

1. **Regular Scanning**: Run weekly scans to track resource changes
2. **Cost Monitoring**: Daily cost checks for budget management
3. **Optimization Reviews**: Monthly optimization opportunity reviews
4. **Automated Alerts**: Set up alerts for budget overruns
5. **Resource Tagging**: Use consistent tagging for better filtering
6. **Multi-Region**: Scan all regions you use resources in
7. **Documentation**: Keep scan results for historical analysis

## Support

For additional help:
- 📧 Email: support@optimisely.ai
- 🌐 Website: https://optimisely.ai
- 📚 Documentation: https://docs.optimisely.ai/cloud-sdk