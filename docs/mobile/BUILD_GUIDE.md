# Waykel Mobile Apps Build Guide

This guide explains how to build the Waykel Customer and Driver mobile apps for Android and iOS.

## Overview

Waykel has **two separate mobile apps**:

| App | App ID | Description |
|-----|--------|-------------|
| **Waykel Customer** | `com.waykel.customer` | For customers booking transportation |
| **Waykel Driver** | `com.waykel.driver` | For drivers accepting and completing rides |

Both apps are built using Capacitor, wrapping the existing React web application into native mobile apps.

## Prerequisites

### For Android Builds
- [Android Studio](https://developer.android.com/studio) installed
- JDK 17 or later
- Android SDK (API level 33+)

### For iOS Builds (macOS only)
- macOS with [Xcode](https://developer.apple.com/xcode/) installed
- Apple Developer Account ($99/year)
- CocoaPods installed: `sudo gem install cocoapods`

---

## Quick Start

### Step 1: Clone Repository Locally

Mobile builds require local development tools. Clone the repo to your machine:

```bash
git clone https://github.com/YOUR_USERNAME/waykel.git
cd waykel
npm install
```

### Step 2: Initialize Native Platforms

Run the initialization script:

```bash
./script/init-mobile-platforms.sh
```

This creates `android/` and `ios/` folders for both apps.

### Step 3: Build an App

#### Customer App
```bash
./script/build-mobile-customer.sh
```

#### Driver App
```bash
./script/build-mobile-driver.sh
```

---

## Detailed Build Instructions

### Customer App (com.waykel.customer)

#### Build Web Assets
```bash
npx vite build --config vite.customer.config.ts
mv dist/customer/customer.html dist/customer/index.html
```

#### Sync with Native Projects
```bash
npx cap sync --config capacitor.customer.config.ts
```

#### Open in IDE
```bash
# Android
npx cap open android --config capacitor.customer.config.ts

# iOS (macOS only)
npx cap open ios --config capacitor.customer.config.ts
```

### Driver App (com.waykel.driver)

#### Build Web Assets
```bash
npx vite build --config vite.driver.config.ts
mv dist/driver/driver.html dist/driver/index.html
```

#### Sync with Native Projects
```bash
npx cap sync --config capacitor.driver.config.ts
```

#### Open in IDE
```bash
# Android
npx cap open android --config capacitor.driver.config.ts

# iOS (macOS only)
npx cap open ios --config capacitor.driver.config.ts
```

---

## Android Build (APK/AAB)

### Debug Build (Testing)

In Android Studio:
1. Open the project: `npx cap open android --config capacitor.customer.config.ts`
2. Wait for Gradle sync
3. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
4. Find APK in `android/app/build/outputs/apk/debug/`

### Release Build (Play Store)

1. **Generate Signing Key:**
```bash
# Customer App
keytool -genkey -v -keystore waykel-customer.keystore -alias waykel-customer -keyalg RSA -keysize 2048 -validity 10000

# Driver App
keytool -genkey -v -keystore waykel-driver.keystore -alias waykel-driver -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure Signing** in `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('waykel-customer.keystore')
            storePassword 'your-password'
            keyAlias 'waykel-customer'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

3. **Build AAB:**
   - Android Studio → Build → Generate Signed Bundle / APK
   - Select Android App Bundle
   - Choose release keystore
   - Build

4. **Upload to Play Console:**
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app
   - Upload AAB
   - Fill store listing

---

## iOS Build (IPA)

### Development Build

In Xcode:
1. Open: `npx cap open ios --config capacitor.customer.config.ts`
2. Select your development team in **Signing & Capabilities**
3. Connect iPhone or select simulator
4. Click **Run** (▶️)

### App Store Build

1. **Configure Bundle Identifier:**
   - Customer: `com.waykel.customer`
   - Driver: `com.waykel.driver`

2. **Create Archive:**
   - Product → Scheme → Edit Scheme → Set to **Release**
   - Product → Archive
   - Wait for build

3. **Upload to App Store Connect:**
   - Window → Organizer
   - Select archive → **Distribute App**
   - Choose **App Store Connect** → Upload

4. **Submit for Review:**
   - [App Store Connect](https://appstoreconnect.apple.com)
   - Select app → Add version details
   - Submit for review

---

## App Configuration

### Customer App (capacitor.customer.config.ts)

| Setting | Value |
|---------|-------|
| App ID | `com.waykel.customer` |
| App Name | `Waykel - Book Transport` |
| Theme Color | `#2563eb` (Blue) |
| Web Dir | `dist/customer` |

### Driver App (capacitor.driver.config.ts)

| Setting | Value |
|---------|-------|
| App ID | `com.waykel.driver` |
| App Name | `Waykel Driver` |
| Theme Color | `#059669` (Green) |
| Web Dir | `dist/driver` |

---

## Native Features

Both apps include these Capacitor plugins:

| Plugin | Usage |
|--------|-------|
| `@capacitor/geolocation` | Live location tracking for rides |
| `@capacitor/camera` | Document upload, profile photos |
| `@capacitor/push-notifications` | Ride alerts, updates |
| `@capacitor/splash-screen` | App launch screen |
| `@capacitor/status-bar` | Status bar styling |

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

## App Icons & Splash Screens

See `resources/README.md` for detailed icon generation instructions.

### Quick Setup

1. Create master icons (1024x1024 PNG)
2. Create splash screens (2732x2732 PNG)
3. Use Capacitor Assets to generate all sizes:

```bash
npm install -g @capacitor/assets

# Customer App
cd resources/customer
npx capacitor-assets generate --iconBackgroundColor '#2563eb'

# Driver App
cd resources/driver
npx capacitor-assets generate --iconBackgroundColor '#059669'
```

---

## API Configuration

Both apps connect to the same backend API. Configure the API URL:

### Development (Local Testing)

Edit `capacitor.customer.config.ts` or `capacitor.driver.config.ts`:

```typescript
server: {
  url: 'http://10.0.2.2:5000', // Android emulator → localhost
  // url: 'http://localhost:5000', // iOS simulator
  cleartext: true,
},
```

### Production

Apps automatically use relative URLs, which resolve to your deployed backend.

---

## Troubleshooting

### Android Issues

```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
npx cap sync --config capacitor.customer.config.ts
```

### iOS Issues

```bash
# Reinstall pods
cd ios/App && pod install --repo-update && cd ../..
npx cap sync --config capacitor.customer.config.ts
```

### Common Errors

| Error | Solution |
|-------|----------|
| "SDK location not found" | Set `ANDROID_HOME` environment variable |
| "No signing certificate" | Add Apple Developer account in Xcode → Preferences |
| "Pod install failed" | `sudo gem install cocoapods` and retry |
| "App not found in config" | Ensure correct `--config` flag |

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

## Estimated Timeline

| Task | Duration |
|------|----------|
| Local setup | 1-2 hours |
| Build Customer APK | 30 mins |
| Build Driver APK | 30 mins |
| Setup Play Store (2 apps) | 4-6 hours |
| Build iOS apps | 1-2 hours |
| Setup App Store (2 apps) | 4-6 hours |
| Review process | 1-7 days |

**Total: 2-3 weeks** (including review times for 4 app submissions)

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
├── script/
│   ├── build-mobile-customer.sh  # Customer app build script
│   ├── build-mobile-driver.sh    # Driver app build script
│   └── init-mobile-platforms.sh  # Initialize native platforms
├── resources/
│   ├── customer/                 # Customer app icons/splash
│   ├── driver/                   # Driver app icons/splash
│   └── README.md                 # Icon generation guide
└── docs/
    └── mobile/
        └── BUILD_GUIDE.md        # This file
```
