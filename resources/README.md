# Mobile App Resources

This directory contains app icons and splash screens for the Waykel mobile apps.

## Directory Structure

```
resources/
├── customer/           # Customer app resources
│   ├── icon/           # App icons
│   │   └── icon.png    # Master icon (1024x1024)
│   └── splash/         # Splash screens
│       └── splash.png  # Master splash (2732x2732)
├── driver/             # Driver app resources
│   ├── icon/           # App icons
│   │   └── icon.png    # Master icon (1024x1024)
│   └── splash/         # Splash screens
│       └── splash.png  # Master splash (2732x2732)
└── README.md           # This file
```

## Creating Icons

### Required Master Assets

1. **App Icon**: 1024x1024 PNG (no transparency for iOS)
2. **Splash Screen**: 2732x2732 PNG (centered logo on solid background)

### Brand Colors

- **Customer App**: Blue `#2563eb` (Waykel primary blue)
- **Driver App**: Green `#059669` (Emerald green)

### Icon Generation Tools

Use one of these tools to generate all required sizes:

1. **Capacitor Assets** (Recommended):
   ```bash
   npm install -g @capacitor/assets
   npx capacitor-assets generate --iconBackgroundColor '#2563eb' --splashBackgroundColor '#2563eb'
   ```

2. **Online Generators**:
   - [App Icon Generator](https://appicon.co/)
   - [Icon Kitchen](https://icon.kitchen/)
   - [Make App Icon](https://makeappicon.com/)

3. **Figma Plugin**: "App Icon Generator" plugin

### Required Icon Sizes

#### Android (mipmap folders)
- mdpi: 48x48
- hdpi: 72x72
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

#### iOS (AppIcon.appiconset)
- 20pt: 20x20, 40x40, 60x60
- 29pt: 29x29, 58x58, 87x87
- 40pt: 40x40, 80x80, 120x120
- 60pt: 120x120, 180x180
- 76pt: 76x76, 152x152
- 83.5pt: 167x167
- 1024pt: 1024x1024 (App Store)

### Splash Screen Sizes

#### Android (drawable folders)
- drawable-land-mdpi: 480x320
- drawable-land-hdpi: 800x480
- drawable-land-xhdpi: 1280x720
- drawable-land-xxhdpi: 1600x960
- drawable-land-xxxhdpi: 1920x1280
- drawable-port-mdpi: 320x480
- drawable-port-hdpi: 480x800
- drawable-port-xhdpi: 720x1280
- drawable-port-xxhdpi: 960x1600
- drawable-port-xxxhdpi: 1280x1920

#### iOS (LaunchImage or Storyboard)
- Use Xcode's LaunchScreen.storyboard for best results
- Add centered logo with background color

## Customer App Design Guidelines

- **Icon**: Waykel logo on blue (#2563eb) background
- **Splash**: White Waykel logo centered on blue background
- **Theme**: Professional, trustworthy, transportation-focused

## Driver App Design Guidelines

- **Icon**: Truck/delivery icon on green (#059669) background
- **Splash**: White Waykel logo with "Driver" text on green background
- **Theme**: Energetic, earnings-focused, professional

## Generating Resources

After placing master assets, run:

```bash
# For Customer App
cd resources/customer
npx @capacitor/assets generate

# For Driver App
cd resources/driver
npx @capacitor/assets generate
```

Then copy generated assets to the native projects.
