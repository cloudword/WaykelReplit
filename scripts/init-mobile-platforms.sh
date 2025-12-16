#!/bin/bash

set -e

echo "========================================"
echo "  Initializing Waykel Mobile Platforms"
echo "========================================"
echo ""
echo "⚠️  This script should only be run ONCE per machine."
echo "    After initialization, use build-mobile-*.sh for daily builds."
echo ""

cd "$(dirname "$0")/.."

# Environment validation
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Please install Node.js first."; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx not found. Please install Node.js/npm first."; exit 1; }

# Check for Java (Android builds)
if command -v java >/dev/null 2>&1; then
  echo "✅ Java found: $(java -version 2>&1 | head -1)"
else
  echo "⚠️  Java not found. Android builds will require JDK 17+."
fi

# Check for Xcode (iOS builds - Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  if command -v xcodebuild >/dev/null 2>&1; then
    echo "✅ Xcode found"
  else
    echo "⚠️  Xcode not found. iOS builds will require Xcode."
  fi
fi

echo ""
echo "Step 1: Installing dependencies (deterministic)..."
npm ci

echo ""
echo "========================================"
echo "  Initializing Customer App Platforms"
echo "========================================"

# Build Customer web assets first
echo ""
echo "Building Customer web assets..."
npx vite build --config vite.customer.config.ts
if [ -f "dist/customer/customer.html" ]; then
  mv dist/customer/customer.html dist/customer/index.html
fi

# Add Android platform for Customer
if [ ! -d "android-customer" ]; then
  echo ""
  echo "Adding Android platform for Customer app..."
  npx cap add android --config capacitor.customer.config.ts
  if [ -d "android" ]; then
    mv android android-customer
    echo "✅ Android platform created at android-customer/"
  fi
else
  echo "✅ Android platform already exists at android-customer/"
fi

# Add iOS platform for Customer (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  if [ ! -d "ios-customer" ]; then
    echo ""
    echo "Adding iOS platform for Customer app..."
    npx cap add ios --config capacitor.customer.config.ts
    if [ -d "ios" ]; then
      mv ios ios-customer
      echo "✅ iOS platform created at ios-customer/"
    fi
  else
    echo "✅ iOS platform already exists at ios-customer/"
  fi
fi

# Sync Customer platforms
echo ""
echo "Syncing Customer platforms..."
npx cap sync --config capacitor.customer.config.ts

echo ""
echo "========================================"
echo "  Initializing Driver App Platforms"
echo "========================================"

# Build Driver web assets
echo ""
echo "Building Driver web assets..."
npx vite build --config vite.driver.config.ts
if [ -f "dist/driver/driver.html" ]; then
  mv dist/driver/driver.html dist/driver/index.html
fi

# Add Android platform for Driver
if [ ! -d "android-driver" ]; then
  echo ""
  echo "Adding Android platform for Driver app..."
  npx cap add android --config capacitor.driver.config.ts
  if [ -d "android" ]; then
    mv android android-driver
    echo "✅ Android platform created at android-driver/"
  fi
else
  echo "✅ Android platform already exists at android-driver/"
fi

# Add iOS platform for Driver (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  if [ ! -d "ios-driver" ]; then
    echo ""
    echo "Adding iOS platform for Driver app..."
    npx cap add ios --config capacitor.driver.config.ts
    if [ -d "ios" ]; then
      mv ios ios-driver
      echo "✅ iOS platform created at ios-driver/"
    fi
  else
    echo "✅ iOS platform already exists at ios-driver/"
  fi
fi

# Sync Driver platforms
echo ""
echo "Syncing Driver platforms..."
npx cap sync --config capacitor.driver.config.ts

echo ""
echo "========================================"
echo "  All Platforms Initialized!"
echo "========================================"
echo ""
echo "Available apps:"
echo ""
echo "  Customer App (com.waykel.customer)"
echo "    - Android: android-customer/"
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "    - iOS: ios-customer/"
fi
echo ""
echo "  Driver App (com.waykel.driver)"
echo "    - Android: android-driver/"
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "    - iOS: ios-driver/"
fi
echo ""
echo "Next steps:"
echo ""
echo "  For daily builds, use:"
echo "    ./scripts/build-mobile-customer.sh"
echo "    ./scripts/build-mobile-driver.sh"
echo ""
echo "  To open in IDE:"
echo "    npx cap open android --config capacitor.customer.config.ts"
echo "    npx cap open android --config capacitor.driver.config.ts"
echo ""
