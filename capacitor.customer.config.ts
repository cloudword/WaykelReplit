import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waykel.customer',
  appName: 'Waykel - Book Transport',
  webDir: 'dist/customer',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563eb",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#2563eb"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Geolocation: {
      enableHighAccuracy: true
    }
  },
  ios: {
    path: "ios-customer",
    contentInset: "automatic",
    scheme: "WaykelCustomer"
  },
  android: {
    path: "android-customer",
    allowMixedContent: false,
    backgroundColor: "#2563eb"
  }
};

export default config;
