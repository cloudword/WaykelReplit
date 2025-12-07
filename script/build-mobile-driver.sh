#!/bin/bash
set -e

echo "Building Waykel Driver App..."

# Build the driver web app
echo "Step 1: Building web assets..."
npx vite build --config vite.driver.config.ts

# Rename HTML file to index.html
echo "Step 2: Preparing output..."
mv dist/driver/driver.html dist/driver/index.html 2>/dev/null || true

# Sync with Capacitor
echo "Step 3: Syncing with native projects..."
npx cap sync --config capacitor.driver.config.ts

echo ""
echo "✅ Driver app built successfully!"
echo ""
echo "Next steps:"
echo "  Android: npx cap open android --config capacitor.driver.config.ts"
echo "  iOS:     npx cap open ios --config capacitor.driver.config.ts"
