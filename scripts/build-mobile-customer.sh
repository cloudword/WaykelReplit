#!/bin/bash

set -e

echo "========================================"
echo "  Building Waykel Customer Mobile App"
echo "========================================"
echo ""

cd "$(dirname "$0")/.."

echo "Step 1: Installing dependencies..."
npm install

echo ""
echo "Step 2: Building web assets..."
npx vite build --config vite.customer.config.ts

echo ""
echo "Step 3: Renaming entry file..."
mv dist/customer/customer.html dist/customer/index.html 2>/dev/null || true

echo ""
echo "Step 4: Adding Android platform (if not exists)..."
if [ ! -d "android-customer" ]; then
  npx cap add android --config capacitor.customer.config.ts
  mv android android-customer 2>/dev/null || true
fi

echo ""
echo "Step 5: Adding iOS platform (if not exists)..."
if [ ! -d "ios-customer" ] && [[ "$OSTYPE" == "darwin"* ]]; then
  npx cap add ios --config capacitor.customer.config.ts
  mv ios ios-customer 2>/dev/null || true
fi

echo ""
echo "Step 6: Syncing with native platforms..."
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
