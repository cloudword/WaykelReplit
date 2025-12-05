# Waykel Mobile App Build Guide

This guide explains how to build the Waykel app for Android (Google Play Store) and iOS (Apple App Store).

## Prerequisites

### For Android:
- [Android Studio](https://developer.android.com/studio) installed
- JDK 17 or later
- Android SDK (API level 33+)

### For iOS:
- macOS with [Xcode](https://developer.apple.com/xcode/) installed
- Apple Developer Account ($99/year)
- CocoaPods installed (`sudo gem install cocoapods`)

## Setup Instructions

### 1. Install Capacitor Dependencies

```bash
# Install Capacitor CLI and core
npm install @capacitor/core @capacitor/cli

# Install platform-specific packages
npm install @capacitor/ios @capacitor/android

# Install essential plugins
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/push-notifications @capacitor/geolocation @capacitor/camera
```

### 2. Initialize Capacitor

```bash
# Initialize Capacitor (already done - capacitor.config.ts exists)
npx cap init Waykel com.waykel.app

# Add platforms
npx cap add android
npx cap add ios
```

### 3. Build the Web App

```bash
# Build production version
npm run build

# Sync web assets to native projects
npx cap sync
```

### 4. Open in Native IDEs

```bash
# Open Android Studio
npx cap open android

# Open Xcode (macOS only)
npx cap open ios
```

---

## Android Build (APK/AAB)

### Debug Build (Testing)
```bash
# Build web app
npm run build

# Sync to Android
npx cap sync android

# Open Android Studio
npx cap open android
```

In Android Studio:
1. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Find APK in `android/app/build/outputs/apk/debug/`

### Release Build (Play Store)

1. **Generate Signing Key:**
```bash
keytool -genkey -v -keystore waykel-release.keystore -alias waykel -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure Signing** in `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('waykel-release.keystore')
            storePassword 'your-password'
            keyAlias 'waykel'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

3. **Build AAB (Android App Bundle):**
   - Android Studio → Build → Generate Signed Bundle / APK
   - Select Android App Bundle
   - Choose release keystore
   - Build

4. **Upload to Play Console:**
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app → Upload AAB → Fill store listing

---

## iOS Build (IPA)

### Development Build

```bash
# Build web app
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npx cap open ios
```

In Xcode:
1. Select your development team in **Signing & Capabilities**
2. Connect iPhone or select simulator
3. Click **Run** (▶️)

### App Store Build

1. **Configure in Xcode:**
   - Open `ios/App/App.xcworkspace`
   - Select **App** target → **Signing & Capabilities**
   - Set **Team** to your Apple Developer account
   - Set **Bundle Identifier** to `com.waykel.app`

2. **Create Archive:**
   - Product → Scheme → Edit Scheme → Set to **Release**
   - Product → Archive
   - Wait for build to complete

3. **Upload to App Store Connect:**
   - Window → Organizer
   - Select archive → **Distribute App**
   - Choose **App Store Connect** → Upload

4. **Submit for Review:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Select your app → Add version details
   - Submit for review

---

## App Icons & Splash Screens

### Required Assets

Create icons in these sizes:

**Android:**
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

**iOS:**
- Use Asset Catalog in Xcode (`ios/App/App/Assets.xcassets/AppIcon.appiconset`)
- Required sizes: 20, 29, 40, 60, 76, 83.5, 1024 (various @1x, @2x, @3x)

### Splash Screen

Add splash screen image:
- `android/app/src/main/res/drawable/splash.png`
- `ios/App/App/Assets.xcassets/Splash.imageset/`

---

## Live Updates (Optional)

For pushing updates without app store review, consider:
- [Capacitor Live Updates](https://capacitorjs.com/docs/guides/live-updates)
- [Ionic Appflow](https://ionic.io/appflow)

---

## Troubleshooting

### Android Issues
```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
npx cap sync android
```

### iOS Issues
```bash
# Reinstall pods
cd ios/App && pod install --repo-update && cd ../..
npx cap sync ios
```

### Common Errors
- **"SDK location not found"**: Set `ANDROID_HOME` environment variable
- **"No signing certificate"**: Add Apple Developer account in Xcode preferences
- **"Pod install failed"**: Run `sudo gem install cocoapods` and retry

---

## App Store Requirements

### Google Play Store
- Privacy Policy URL (required)
- App screenshots (phone and tablet)
- Feature graphic (1024x500)
- Short description (80 chars)
- Full description (4000 chars)
- Content rating questionnaire

### Apple App Store
- Privacy Policy URL (required)
- App screenshots (various device sizes)
- App Preview video (optional)
- Description, keywords, support URL
- Age rating questionnaire
- App Review Information

---

## Estimated Timeline

| Task | Duration |
|------|----------|
| Setup Capacitor | 1 hour |
| Build Android APK | 30 mins |
| Setup Play Store listing | 2-3 hours |
| Build iOS IPA | 1 hour |
| Setup App Store listing | 2-3 hours |
| Apple Review Process | 1-7 days |
| Google Review Process | 1-3 days |

**Total: 1-2 weeks** (including review times)
