#!/bin/bash

set -e

echo "========================================"
echo "  Initializing Waykel Mobile Platforms"
echo "========================================"
echo ""

cd "$(dirname "$0")/.."

echo "This script will set up both Customer and Driver mobile apps."
echo ""

echo "Step 1: Installing dependencies..."
npm install

echo ""
echo "========================================"
echo "  Building Customer App"
echo "========================================"
./scripts/build-mobile-customer.sh

echo ""
echo "========================================"
echo "  Building Driver App"
echo "========================================"
./scripts/build-mobile-driver.sh

echo ""
echo "========================================"
echo "  All Platforms Initialized!"
echo "========================================"
echo ""
echo "Available apps:"
echo ""
echo "  Customer App (com.waykel.customer)"
echo "    - Android: android-customer/"
echo "    - iOS: ios-customer/ (Mac only)"
echo ""
echo "  Driver App (com.waykel.driver)"
echo "    - Android: android-driver/"
echo "    - iOS: ios-driver/ (Mac only)"
echo ""
echo "Next steps:"
echo "  1. Open the app in your IDE:"
echo "     npx cap open android --config capacitor.customer.config.ts"
echo "     npx cap open android --config capacitor.driver.config.ts"
echo ""
echo "  2. Build and run on a device or emulator"
echo ""
