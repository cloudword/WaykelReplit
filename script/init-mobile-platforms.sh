#!/bin/bash
set -e

echo "Initializing mobile platforms for Waykel apps..."
echo ""

# Initialize Customer App platforms
echo "=== Customer App (com.waykel.customer) ==="
echo "Adding Android platform..."
npx cap add android --config capacitor.customer.config.ts || echo "Android already exists"
echo "Adding iOS platform..."
npx cap add ios --config capacitor.customer.config.ts || echo "iOS already exists"

echo ""

# Initialize Driver App platforms
echo "=== Driver App (com.waykel.driver) ==="
echo "Adding Android platform..."
npx cap add android --config capacitor.driver.config.ts || echo "Android already exists"
echo "Adding iOS platform..."
npx cap add ios --config capacitor.driver.config.ts || echo "iOS already exists"

echo ""
echo "✅ Mobile platforms initialized!"
echo ""
echo "Note: Android and iOS folders have been created."
echo "You'll need to:"
echo "  1. Clone this repo to your local machine"
echo "  2. Install Android Studio (for Android builds)"
echo "  3. Install Xcode on macOS (for iOS builds)"
