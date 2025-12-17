#!/bin/bash

set -e

echo "========================================"
echo "  Building Waykel Driver Mobile App"
echo "========================================"
echo ""

cd "$(dirname "$0")/.."

# Environment validation
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Please install Node.js first."; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx not found. Please install Node.js/npm first."; exit 1; }

# Platform existence check
if [ ! -d "android-driver" ] && [ ! -d "ios-driver" ]; then
  echo "❌ Mobile platforms not found."
  echo "   Run ./scripts/init-mobile-platforms.sh first to set up platforms."
  exit 1
fi

echo "Step 1: Installing dependencies (deterministic)..."
npm ci

echo ""
echo "Step 2: Building web assets..."
npx vite build --config vite.driver.config.ts

echo ""
echo "Step 3: Renaming output to index.html..."
if [ -f "dist/driver/driver.html" ]; then
  mv dist/driver/driver.html dist/driver/index.html
fi

echo ""
echo "Step 4: Preparing Capacitor config..."
cp capacitor.driver.config.ts capacitor.config.ts

echo ""
echo "Step 5: Syncing with native platforms..."
npx cap sync

echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "To open in Android Studio:"
echo "  npx cap open android"
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "To open in Xcode:"
  echo "  npx cap open ios"
  echo ""
fi
echo "App ID: com.waykel.driver"
echo "App Name: Waykel Driver"
echo ""
