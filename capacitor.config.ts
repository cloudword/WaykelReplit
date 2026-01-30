import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waykel.driver',
  appName: 'Waykel Driver',
  webDir: 'dist/driver',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#059669",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#059669"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Geolocation: {
      enableHighAccuracy: true
    },
    Camera: {
      presentationStyle: "fullscreen"
    }
  },
  ios: {
    contentInset: "automatic",
    scheme: "WaykelDriver"
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#059669"
  }
};

export default config;
