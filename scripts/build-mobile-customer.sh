#!/bin/bash

set -e

echo "========================================"
echo "  Building Waykel Customer Mobile App"
echo "========================================"
echo ""

cd "$(dirname "$0")/.."

# Environment validation
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Please install Node.js first."; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx not found. Please install Node.js/npm first."; exit 1; }

# Platform existence check
if [ ! -d "android-customer" ] && [ ! -d "ios-customer" ]; then
  echo "❌ Mobile platforms not found."
  echo "   Run ./scripts/init-mobile-platforms.sh first to set up platforms."
  exit 1
fi

echo "Step 1: Installing dependencies (deterministic)..."
npm ci

echo ""
echo "Step 2: Building web assets..."
npx vite build --config vite.customer.config.ts

echo ""
echo "Step 3: Renaming output to index.html..."
if [ -f "dist/customer/customer.html" ]; then
  mv dist/customer/customer.html dist/customer/index.html
fi

echo ""
echo "Step 4: Syncing with native platforms..."
npx cap sync --config capacitor.customer.config.ts

echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "To open in Android Studio:"
echo "  npx cap open android --config capacitor.customer.config.ts"
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "To open in Xcode:"
  echo "  npx cap open ios --config capacitor.customer.config.ts"
  echo ""
fi
echo "App ID: com.waykel.customer"
echo "App Name: Waykel - Book Transport"
echo ""
