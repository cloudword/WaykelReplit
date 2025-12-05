import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waykel.app',
  appName: 'Waykel',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // For development, uncomment this to connect to local server
    // url: 'http://10.0.2.2:5000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563eb",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#2563eb"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
  ios: {
    contentInset: "automatic"
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
