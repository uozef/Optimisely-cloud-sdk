#!/bin/bash

# Optimisely Cloud SDK - NPM Publishing Script
# Run this script to publish the package to npm registry

set -e  # Exit on error

echo "🚀 Optimisely Cloud SDK - NPM Publishing"
echo "========================================"

# Check if logged in to npm
echo "1. Checking npm authentication..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to npm"
    echo "Please run: npm login"
    echo "Then run this script again"
    exit 1
fi

echo "✅ Logged in as: $(npm whoami)"

# Build the project
echo ""
echo "2. Building project..."
npm run build
echo "✅ Build completed"

# Dry run to check package contents
echo ""
echo "3. Running dry-run to verify package contents..."
npm publish --dry-run
echo "✅ Package verified"

# Ask for confirmation
echo ""
echo "4. Ready to publish optimisely-cloud-sdk@$(node -p "require('./package.json').version")"
echo "Package will include:"
echo "  - Core SDK library"
echo "  - CLI tool (optimisely command)"
echo "  - TypeScript definitions"
echo "  - Documentation and examples"
echo ""
read -p "Do you want to proceed with publishing? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Publish to npm
    echo "5. Publishing to npm registry..."
    npm publish --access public

    echo ""
    echo "🎉 SUCCESS! Package published to npm"
    echo "🔗 View at: https://www.npmjs.com/package/optimisely-cloud-sdk"
    echo ""
    echo "Users can now install with:"
    echo "  npm install optimisely-cloud-sdk"
    echo "  npm install -g optimisely-cloud-sdk  # For CLI"
    echo ""
    echo "Test installation:"
    echo "  npm info optimisely-cloud-sdk"

else
    echo "❌ Publishing cancelled"
    exit 1
fi