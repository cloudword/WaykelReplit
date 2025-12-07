#!/bin/bash
set -e

echo "Building Waykel Customer App..."

# Build the customer web app
echo "Step 1: Building web assets..."
npx vite build --config vite.customer.config.ts

# Rename HTML file to index.html
echo "Step 2: Preparing output..."
mv dist/customer/customer.html dist/customer/index.html 2>/dev/null || true

# Sync with Capacitor
echo "Step 3: Syncing with native projects..."
npx cap sync --config capacitor.customer.config.ts

echo ""
echo "✅ Customer app built successfully!"
echo ""
echo "Next steps:"
echo "  Android: npx cap open android --config capacitor.customer.config.ts"
echo "  iOS:     npx cap open ios --config capacitor.customer.config.ts"
