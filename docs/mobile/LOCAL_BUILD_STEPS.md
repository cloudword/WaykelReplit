# Step-by-Step Local Build Guide for Waykel Mobile Apps

Follow these exact steps to build the Android and iOS apps on your local machine.

---

## PART 1: ONE-TIME SETUP (Do this once)

### Step 1: Install Git (if not already installed)

**Windows:**
- Download from https://git-scm.com/download/win
- Run installer, use default settings

**Mac:**
- Open Terminal and run: `xcode-select --install`

**Linux:**
```bash
sudo apt update && sudo apt install git
```

---

### Step 2: Install Node.js

Download from https://nodejs.org (LTS version recommended)

Verify installation:
```bash
node --version   # Should show v18+ or v20+
npm --version    # Should show 9+ or 10+
```

---

### Step 3: Install Android Studio (for Android apps)

1. Download from https://developer.android.com/studio
2. Run the installer
3. During setup, make sure to install:
   - Android SDK
   - Android SDK Platform-Tools
   - Android Virtual Device (AVD)
4. Open Android Studio → More Actions → SDK Manager
5. Install **Android 13 (API 33)** or higher

**Set Environment Variables:**

**Windows** (add to System Environment Variables):
```
ANDROID_HOME = C:\Users\YOUR_NAME\AppData\Local\Android\Sdk
```
Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

**Mac/Linux** (add to ~/.bashrc or ~/.zshrc):
```bash
export ANDROID_HOME=$HOME/Android/Sdk   # or ~/Library/Android/sdk on Mac
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator
```

---

### Step 4: Install Xcode (for iOS apps - Mac only)

1. Open App Store on your Mac
2. Search for "Xcode"
3. Click Install (it's free, but ~12GB download)
4. After install, open Xcode once to accept licenses
5. Install CocoaPods:
```bash
sudo gem install cocoapods
```

---

## PART 2: GET THE CODE

### Step 5: Clone the Repository

Open Terminal (Mac/Linux) or Command Prompt (Windows):

```bash
# Navigate to where you want the project
cd ~/Documents   # or any folder you prefer

# Clone from GitHub (replace with your actual repo URL)
git clone https://github.com/YOUR_USERNAME/waykel.git

# Enter the project folder
cd waykel
```

**If you don't have a GitHub repo yet:**
1. Go to your Replit project
2. Click the Git icon in the left sidebar
3. Connect to GitHub and push your code
4. Then clone as shown above

---

### Step 6: Install Dependencies

```bash
npm install
```

This installs all required packages including Capacitor.

---

## PART 3: INITIALIZE NATIVE PROJECTS

### Step 7: Create Android and iOS Folders

**For Customer App:**
```bash
npx cap add android --config capacitor.customer.config.ts
npx cap add ios --config capacitor.customer.config.ts
```

**For Driver App:**
```bash
npx cap add android --config capacitor.driver.config.ts
npx cap add ios --config capacitor.driver.config.ts
```

This creates `android/` and `ios/` folders in your project.

---

## PART 4: BUILD THE APPS

### Step 8: Build Customer App

#### 8a. Build web assets:
```bash
npx vite build --config vite.customer.config.ts
```

#### 8b. Rename the HTML file:
**Windows:**
```cmd
move dist\customer\customer.html dist\customer\index.html
```

**Mac/Linux:**
```bash
mv dist/customer/customer.html dist/customer/index.html
```

#### 8c. Sync with native projects:
```bash
npx cap sync --config capacitor.customer.config.ts
```

---

### Step 9: Build Driver App

#### 9a. Build web assets:
```bash
npx vite build --config vite.driver.config.ts
```

#### 9b. Rename the HTML file:
**Windows:**
```cmd
move dist\driver\driver.html dist\driver\index.html
```

**Mac/Linux:**
```bash
mv dist/driver/driver.html dist/driver/index.html
```

#### 9c. Sync with native projects:
```bash
npx cap sync --config capacitor.driver.config.ts
```

---

## PART 5: CREATE APK FILES (Android)

### Step 10: Open in Android Studio

**For Customer App:**
```bash
npx cap open android --config capacitor.customer.config.ts
```

**For Driver App:**
```bash
npx cap open android --config capacitor.driver.config.ts
```

Android Studio will open automatically.

---

### Step 11: Build APK in Android Studio

1. Wait for Gradle sync to complete (bottom progress bar)
2. Go to menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Wait for build to complete
4. Click "locate" in the notification that appears
5. Your APK is at: `android/app/build/outputs/apk/debug/app-debug.apk`

**To install on your phone:**
- Connect phone via USB
- Enable "USB Debugging" in phone settings (Developer Options)
- Drag the APK to your phone, or use:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## PART 6: CREATE IPA FILES (iOS - Mac Only)

### Step 12: Open in Xcode

**For Customer App:**
```bash
npx cap open ios --config capacitor.customer.config.ts
```

**For Driver App:**
```bash
npx cap open ios --config capacitor.driver.config.ts
```

---

### Step 13: Configure Signing in Xcode

1. In Xcode, click **App** in the left sidebar
2. Select **Signing & Capabilities** tab
3. Check **"Automatically manage signing"**
4. Select your **Team** (your Apple ID)
   - If no team appears, go to Xcode → Settings → Accounts → Add Apple ID
5. Change **Bundle Identifier** to:
   - Customer: `com.waykel.customer`
   - Driver: `com.waykel.driver`

---

### Step 14: Run on Simulator or Device

**Simulator:**
1. Select iPhone simulator from top dropdown (e.g., "iPhone 15")
2. Click the Play button (▶️)

**Real iPhone:**
1. Connect iPhone via cable
2. Select your iPhone from the dropdown
3. Click Play (▶️)
4. On first run, go to iPhone Settings → General → Device Management → Trust your developer profile

---

## QUICK REFERENCE COMMANDS

```bash
# === CUSTOMER APP ===
# Build + Sync
npx vite build --config vite.customer.config.ts
mv dist/customer/customer.html dist/customer/index.html
npx cap sync --config capacitor.customer.config.ts

# Open in IDEs
npx cap open android --config capacitor.customer.config.ts
npx cap open ios --config capacitor.customer.config.ts

# === DRIVER APP ===
# Build + Sync
npx vite build --config vite.driver.config.ts
mv dist/driver/driver.html dist/driver/index.html
npx cap sync --config capacitor.driver.config.ts

# Open in IDEs
npx cap open android --config capacitor.driver.config.ts
npx cap open ios --config capacitor.driver.config.ts
```

---

## TROUBLESHOOTING

### "Gradle sync failed"
```bash
cd android
./gradlew clean
cd ..
npx cap sync --config capacitor.customer.config.ts
```

### "Pod install failed" (iOS)
```bash
cd ios/App
pod install --repo-update
cd ../..
```

### "ANDROID_HOME not set"
Make sure you've set the environment variable as shown in Step 3.

### "No developer team found" (iOS)
Sign in with your Apple ID in Xcode → Settings → Accounts.

### Build crashes on phone
Connect phone, open Android Studio → Logcat (bottom panel) to see error logs.

---

## NEED HELP?

If you get stuck:
1. Take a screenshot of the error
2. Note which step you're on
3. Share both with me and I'll help you resolve it
