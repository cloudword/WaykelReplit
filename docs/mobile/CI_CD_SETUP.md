# Mobile Apps CI/CD Setup Guide

This guide explains how to configure GitHub Actions for automated mobile app builds.

## Overview

The CI/CD pipeline automatically builds both Android and iOS apps:
- **On push to main**: Builds debug versions of both apps
- **On pull request**: Validates builds before merge
- **Manual trigger**: Build specific app on demand

## Workflows

| Workflow | File | Output |
|----------|------|--------|
| Android Builds | `.github/workflows/build-android.yml` | APK files |
| iOS Builds | `.github/workflows/build-ios.yml` | Simulator builds |

---

## Quick Start (Debug Builds)

Debug builds work without any additional setup:

1. Push code to GitHub
2. GitHub Actions automatically triggers
3. Download APK artifacts from Actions tab

---

## Setting Up Release Builds (Android)

Release builds require signing keys stored as GitHub Secrets.

### Step 1: Generate Keystores

```bash
# Customer App
keytool -genkey -v \
  -keystore waykel-customer.jks \
  -alias waykel-customer \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Driver App
keytool -genkey -v \
  -keystore waykel-driver.jks \
  -alias waykel-driver \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### Step 2: Encode Keystores as Base64

```bash
# Customer
base64 -i waykel-customer.jks -o customer-keystore-base64.txt

# Driver
base64 -i waykel-driver.jks -o driver-keystore-base64.txt
```

### Step 3: Add GitHub Secrets

Go to **Repository → Settings → Secrets and variables → Actions** and add:

**Customer App:**
| Secret Name | Value |
|-------------|-------|
| `CUSTOMER_KEYSTORE_BASE64` | Contents of `customer-keystore-base64.txt` |
| `CUSTOMER_KEYSTORE_PASSWORD` | Keystore password |
| `CUSTOMER_KEY_ALIAS` | `waykel-customer` |
| `CUSTOMER_KEY_PASSWORD` | Key password |

**Driver App:**
| Secret Name | Value |
|-------------|-------|
| `DRIVER_KEYSTORE_BASE64` | Contents of `driver-keystore-base64.txt` |
| `DRIVER_KEYSTORE_PASSWORD` | Keystore password |
| `DRIVER_KEY_ALIAS` | `waykel-driver` |
| `DRIVER_KEY_PASSWORD` | Key password |

### Step 4: Trigger Build

```bash
git push origin main
```

The workflow will:
1. Build debug APK (always)
2. Build signed release APK (if secrets are configured)
3. Upload both as artifacts

---

## Setting Up Release Builds (iOS)

iOS release builds require Apple Developer certificates. This is more complex than Android.

### Option 1: Manual Builds (Recommended for Small Teams)

1. Use CI for simulator builds (validation)
2. Build release IPA locally on a Mac
3. Upload to TestFlight/App Store manually

### Option 2: Automated Builds with Fastlane

For full automation, you'll need:

1. **Apple Developer Account** ($99/year)
2. **Distribution Certificate** (p12 file)
3. **Provisioning Profiles** (for each app)
4. **App Store Connect API Key**

Add these secrets:
| Secret Name | Description |
|-------------|-------------|
| `APPLE_DISTRIBUTION_CERTIFICATE` | Base64-encoded p12 certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password |
| `CUSTOMER_PROVISIONING_PROFILE` | Base64-encoded provisioning profile |
| `DRIVER_PROVISIONING_PROFILE` | Base64-encoded provisioning profile |
| `APP_STORE_CONNECT_API_KEY` | API key for upload |

See [GitHub's iOS deployment guide](https://docs.github.com/en/actions/deployment/deploying-xcode-applications/installing-an-apple-certificate-on-macos-runners-for-xcode-development) for detailed instructions.

---

## Manual Workflow Trigger

You can manually trigger builds from GitHub:

1. Go to **Actions** tab
2. Select **Build Android Apps** or **Build iOS Apps**
3. Click **Run workflow**
4. Choose which app to build:
   - `customer` - Only Customer app
   - `driver` - Only Driver app
   - `both` - Both apps

---

## Downloading Build Artifacts

After a successful build:

1. Go to **Actions** tab
2. Click on the completed workflow run
3. Scroll to **Artifacts** section
4. Download:
   - `waykel-customer-debug` - Customer debug APK
   - `waykel-driver-debug` - Driver debug APK
   - `waykel-customer-release` - Customer release APK (if configured)
   - `waykel-driver-release` - Driver release APK (if configured)

Artifacts are retained for:
- Debug builds: 14 days
- Release builds: 30 days

---

## Build Triggers

Builds automatically trigger on:

| Event | Apps Built |
|-------|------------|
| Push to `main` | Both |
| Pull request to `main` | Both |
| Changes to `client/**` | Both |
| Changes to `shared/**` | Both |
| Changes to Capacitor configs | Both |
| Changes to Vite configs | Both |
| Manual dispatch | Selected |

---

## Caching

The workflow caches:
- Node modules (via `setup-node` with cache)
- Gradle dependencies (automatic)
- CocoaPods dependencies (automatic)

This significantly speeds up subsequent builds.

---

## Troubleshooting

### Build Fails: "SDK location not found"
The `android-actions/setup-android@v3` action should handle this. If not, add:
```yaml
- name: Set ANDROID_HOME
  run: echo "ANDROID_HOME=$ANDROID_SDK_ROOT" >> $GITHUB_ENV
```

### Build Fails: "No signing config"
Release builds require all 4 secrets for each app. Check that all secrets are set correctly.

### iOS Build Fails: Pod install error
Add this step before pod install:
```yaml
- name: Update CocoaPods repo
  run: pod repo update
```

### Artifact download fails
Artifacts expire after the retention period. Re-run the workflow to generate new artifacts.

---

## Version Bumping (Manual)

Before releasing a new version, update version numbers:

### Android
Edit `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 2      // Increment for each release
        versionName "1.0.1"
    }
}
```

### iOS
Edit `ios/App/App/Info.plist`:
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.1</string>
<key>CFBundleVersion</key>
<string>2</string>
```

---

## Future Improvements

Consider adding:
- [ ] Automated version bumping (using semantic versioning)
- [ ] Auto-upload to Play Store (using `r0adkll/upload-google-play`)
- [ ] Auto-upload to TestFlight (using `apple-actions/upload-testflight-build`)
- [ ] Slack/Discord notifications on build status
- [ ] Beta track deployment on PR merge
