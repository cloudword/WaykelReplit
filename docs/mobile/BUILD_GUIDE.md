# Waykel Mobile Apps - Build Guide

This guide covers building the Waykel Customer and Driver mobile apps using Capacitor.

## Overview

Waykel has **two separate mobile apps**:

| App | App ID | Theme | Description |
|-----|--------|-------|-------------|
| **Waykel Customer** | `com.waykel.customer` | Blue (#2563eb) | For customers booking transportation |
| **Waykel Driver** | `com.waykel.driver` | Emerald (#059669) | For drivers accepting and completing rides |

Both apps are built using Capacitor, wrapping the existing React web application into native mobile apps.

---

## Prerequisites

### Required for All Platforms
- **Node.js 18+** and **npm 9+**
- Git

### Android Development
- **Android Studio** (latest stable)
- **JDK 17** or later
- **Android SDK** (API level 33+)
- **Android SDK Build Tools 33+**
- **Android Emulator** OR physical device

**Environment Variables (add to `~/.bashrc` or `~/.zshrc`):**
```bash
export JAVA_HOME=/path/to/jdk17
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# or
export ANDROID_HOME=$HOME/Android/Sdk  # Linux
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### iOS Development (macOS only)
- **Xcode 15+**
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install
  ```
- **CocoaPods** (pinned version recommended):
  ```bash
  sudo gem install cocoapods -v 1.15.2
  ```
- **Apple Developer Account** ($99/year for App Store)

---

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/waykel.git
cd waykel
npm ci  # Use npm ci for deterministic installs
```

### 2. One-Time Platform Setup
Run this **once** per machine to initialize native platforms:
```bash
chmod +x scripts/*.sh
./scripts/init-mobile-platforms.sh
```

> ⚠️ **Important**: This script should only be run **once**. Re-running `cap add` can corrupt native projects.

This creates:
- `android-customer/` - Customer app Android project
- `android-driver/` - Driver app Android project
- `ios-customer/` - Customer app iOS project (macOS only)
- `ios-driver/` - Driver app iOS project (macOS only)

### 3. Daily Builds
After initial setup, use these for regular builds:
```bash
# Build Customer app
./scripts/build-mobile-customer.sh

# Build Driver app
./scripts/build-mobile-driver.sh
```

> These scripts only sync existing platforms with the latest web build - they never run `cap add`.

### 4. Open in IDE
```bash
# Customer app
npx cap open android --config capacitor.customer.config.ts  # Android
npx cap open ios --config capacitor.customer.config.ts      # iOS (macOS)

# Driver app
npx cap open android --config capacitor.driver.config.ts    # Android
npx cap open ios --config capacitor.driver.config.ts        # iOS (macOS)
```

---

## Native Permissions

### Android (`android-*/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.INTERNET"/>
```

### iOS (`ios-*/App/App/Info.plist`)
```xml
<key>NSCameraUsageDescription</key>
<string>Waykel needs camera access to capture document photos</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Waykel needs location access to show nearby transport options</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Waykel needs location access for trip tracking</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Waykel needs photo library access to upload documents</string>
```

> ⚠️ **Without these permissions**, apps will crash or be rejected from stores.

---

## Building Release APK (Android)

### Debug APK
1. Open in Android Studio: `npx cap open android --config capacitor.customer.config.ts`
2. Wait for Gradle sync
3. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. APK location: `android-customer/app/build/outputs/apk/debug/app-debug.apk`

### Signed Release APK

1. **Generate Signing Key** (keep this secure!):
```bash
# Customer App
keytool -genkey -v -keystore keystore/waykel-customer.jks -alias waykel-customer -keyalg RSA -keysize 2048 -validity 10000

# Driver App
keytool -genkey -v -keystore keystore/waykel-driver.jks -alias waykel-driver -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure ProGuard & Signing** in `android-customer/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../keystore/waykel-customer.jks')
            storePassword 'your-password'
            keyAlias 'waykel-customer'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. **Build Release**:
   - Android Studio → **Build** → **Generate Signed Bundle / APK**
   - Select **APK** or **Android App Bundle**
   - Choose release keystore
   - Build

> ⚠️ **Keystore Backup**: Store keystore files securely. If lost, you cannot update your app on Play Store.

---

## Building IPA (iOS - macOS only)

### Development Build
1. Open in Xcode: `npx cap open ios --config capacitor.customer.config.ts`
2. Select your development team in **Signing & Capabilities**
3. Enable **Automatically manage signing**
4. Connect iPhone or select simulator
5. **Product** → **Run**

### App Store Build

**Required Steps** (Apple is strict):
1. Enable **Automatic Signing** in Xcode
2. Select your **Development Team**
3. Match **Bundle Identifier** exactly: `com.waykel.customer`
4. Enable **Push Notifications** capability

**Build & Submit**:
1. Select **Any iOS Device (arm64)**
2. **Product** → **Archive**
3. In Organizer, select archive → **Distribute App**
4. Choose **App Store Connect** → Upload

> ⚠️ Without proper signing setup, archive succeeds but upload fails.

---

## Version Management

### Android
Update in `android-*/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 2        // Increment for each release (integer)
        versionName "1.0.1"  // User-visible version (string)
    }
}
```

Or via Capacitor CLI:
```bash
npx cap set android.versionCode=2
npx cap set android.versionName=1.0.1
```

### iOS
Update in Xcode or `ios-*/App/App/Info.plist`:
- `CFBundleShortVersionString`: "1.0.1" (user-visible)
- `CFBundleVersion`: "2" (build number)

> ⚠️ App stores reject builds without proper versioning.

---

## Native Features Configured

| Feature | Plugin | Status |
|---------|--------|--------|
| **Geolocation** | @capacitor/geolocation | ✅ High accuracy |
| **Camera** | @capacitor/camera | ✅ Photo capture |
| **Push Notifications** | @capacitor/push-notifications | ✅ Ready |
| **Splash Screen** | @capacitor/splash-screen | ✅ Auto-hide |
| **Status Bar** | @capacitor/status-bar | ✅ Styled |

### Using Native Features in Code

```typescript
import { getCurrentPosition, takePhoto, initPushNotifications } from '@/lib/native';

// Get location
const position = await getCurrentPosition();

// Take photo
const photoBase64 = await takePhoto();

// Initialize push notifications
const token = await initPushNotifications({
  onReceived: (notification) => console.log('Received:', notification),
  onTapped: (action) => console.log('Tapped:', action),
});
```

---

## Troubleshooting

### "Platform not found" Error
Run initialization first:
```bash
./scripts/init-mobile-platforms.sh
```

### Gradle Sync Failed (Android)
1. **File** → **Sync Project with Gradle Files**
2. Check `JAVA_HOME` is set correctly
3. Verify Android SDK is installed

### Pod Install Failed (iOS)
```bash
cd ios-customer/App
pod deintegrate
pod install --repo-update
```

### Build Fails After Native Changes
Re-sync platforms:
```bash
npx cap sync --config capacitor.customer.config.ts
```

### Common Errors

| Error | Solution |
|-------|----------|
| "SDK location not found" | Set `ANDROID_HOME` environment variable |
| "No signing certificate" | Add Apple Developer account in Xcode → Preferences |
| "Pod install failed" | `sudo gem install cocoapods` and retry |
| "App not found in config" | Ensure correct `--config` flag |
| "Java not found" | Install JDK 17 and set `JAVA_HOME` |

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build Mobile Apps

on:
  push:
    branches: [main]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - run: npm ci
      - run: chmod +x scripts/*.sh && ./scripts/init-mobile-platforms.sh
      - run: cd android-customer && ./gradlew assembleRelease
```

---

## Store Submission Checklist

### Google Play Store

- [ ] Privacy Policy URL
- [ ] App screenshots (phone + tablet)
- [ ] Feature graphic (1024x500)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Content rating questionnaire
- [ ] Data safety form

### Apple App Store

- [ ] Privacy Policy URL
- [ ] App screenshots (various sizes)
- [ ] App Preview video (optional)
- [ ] Description + keywords
- [ ] Support URL
- [ ] Age rating questionnaire
- [ ] App Review Information

---

## Important Notes

1. **Never re-run `cap add`** after initial setup - it can corrupt native projects
2. **Use `npm ci`** for deterministic, reproducible builds
3. **Keep keystores secure** - back up keystore files (never commit to git)
4. **Separate Firebase projects** - use different projects for Customer/Driver push notifications
5. **Test on real devices** - emulators don't fully test native features

---

## File Structure

```
├── capacitor.customer.config.ts  # Customer app Capacitor config
├── capacitor.driver.config.ts    # Driver app Capacitor config
├── vite.customer.config.ts       # Customer app Vite build config
├── vite.driver.config.ts         # Driver app Vite build config
├── client/
│   ├── customer.html             # Customer app entry HTML
│   ├── driver.html               # Driver app entry HTML
│   └── src/
│       ├── CustomerApp.tsx       # Customer app React root
│       ├── DriverApp.tsx         # Driver app React root
│       ├── main.customer.tsx     # Customer app entry point
│       ├── main.driver.tsx       # Driver app entry point
│       └── lib/
│           └── native.ts         # Native feature utilities
├── scripts/
│   ├── build-mobile-customer.sh  # Customer app build script
│   ├── build-mobile-driver.sh    # Driver app build script
│   └── init-mobile-platforms.sh  # Initialize native platforms (ONE TIME)
├── keystore/                     # Store keystores here (gitignored)
└── docs/
    └── mobile/
        └── BUILD_GUIDE.md        # This file
```
