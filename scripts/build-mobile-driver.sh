#!/bin/bash

set -e

echo "========================================"
echo "  Building Waykel Driver Mobile App"
echo "========================================"
echo ""

cd "$(dirname "$0")/.."

echo "Step 1: Installing dependencies..."
npm install

echo ""
echo "Step 2: Building web assets..."
npx vite build --config vite.driver.config.ts

echo ""
echo "Step 3: Renaming entry file..."
mv dist/driver/driver.html dist/driver/index.html 2>/dev/null || true

echo ""
echo "Step 4: Adding Android platform (if not exists)..."
if [ ! -d "android-driver" ]; then
  npx cap add android --config capacitor.driver.config.ts
  mv android android-driver 2>/dev/null || true
fi

echo ""
echo "Step 5: Adding iOS platform (if not exists)..."
if [ ! -d "ios-driver" ] && [[ "$OSTYPE" == "darwin"* ]]; then
  npx cap add ios --config capacitor.driver.config.ts
  mv ios ios-driver 2>/dev/null || true
fi

echo ""
echo "Step 6: Syncing with native platforms..."
npx cap sync --config capacitor.driver.config.ts

echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "To open in Android Studio:"
echo "  npx cap open android --config capacitor.driver.config.ts"
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "To open in Xcode:"
  echo "  npx cap open ios --config capacitor.driver.config.ts"
  echo ""
fi
echo "App ID: com.waykel.driver"
echo "App Name: Waykel Driver"
echo ""
