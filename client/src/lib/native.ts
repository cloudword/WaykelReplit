import { Capacitor } from "@capacitor/core";
import { Geolocation, type Position } from "@capacitor/geolocation";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from "@capacitor/push-notifications";

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

export async function getCurrentPosition(): Promise<Position | null> {
  if (!isNative && !("geolocation" in navigator)) {
    console.warn("Geolocation not available");
    return null;
  }
  
  try {
    if (isNative) {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== "granted") {
        const request = await Geolocation.requestPermissions();
        if (request.location !== "granted") {
          console.warn("Location permission denied");
          return null;
        }
      }
      return await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
    } else {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            },
            timestamp: pos.timestamp,
          }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }
  } catch (error) {
    console.error("Error getting location:", error);
    return null;
  }
}

export async function watchPosition(
  callback: (position: Position) => void
): Promise<string | null> {
  if (!isNative && !("geolocation" in navigator)) {
    return null;
  }

  try {
    if (isNative) {
      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (position) => {
          if (position) callback(position);
        }
      );
      return watchId;
    } else {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => callback({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          },
          timestamp: pos.timestamp,
        }),
        (error) => console.error("Watch position error:", error),
        { enableHighAccuracy: true }
      );
      return watchId.toString();
    }
  } catch (error) {
    console.error("Error watching position:", error);
    return null;
  }
}

export async function clearPositionWatch(watchId: string): Promise<void> {
  try {
    if (isNative) {
      await Geolocation.clearWatch({ id: watchId });
    } else {
      navigator.geolocation.clearWatch(parseInt(watchId));
    }
  } catch (error) {
    console.error("Error clearing watch:", error);
  }
}

export async function takePhoto(): Promise<string | null> {
  if (!isNative) {
    console.warn("Camera only available on native platforms");
    return null;
  }

  try {
    const permission = await Camera.checkPermissions();
    if (permission.camera !== "granted") {
      const request = await Camera.requestPermissions();
      if (request.camera !== "granted") {
        console.warn("Camera permission denied");
        return null;
      }
    }

    const image = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      quality: 80,
      allowEditing: false,
    });

    return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
  } catch (error) {
    console.error("Error taking photo:", error);
    return null;
  }
}

export async function pickPhoto(): Promise<string | null> {
  if (!isNative) {
    console.warn("Photo picker only available on native platforms");
    return null;
  }

  try {
    const image = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
      quality: 80,
    });

    return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
  } catch (error) {
    console.error("Error picking photo:", error);
    return null;
  }
}

export interface PushNotificationCallbacks {
  onRegistration?: (token: Token) => void;
  onReceived?: (notification: PushNotificationSchema) => void;
  onTapped?: (action: ActionPerformed) => void;
  onError?: (error: unknown) => void;
}

export async function initPushNotifications(
  callbacks: PushNotificationCallbacks = {}
): Promise<string | null> {
  if (!isNative) {
    console.warn("Push notifications only available on native platforms");
    return null;
  }

  try {
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") {
      const request = await PushNotifications.requestPermissions();
      if (request.receive !== "granted") {
        console.warn("Push notification permission denied");
        return null;
      }
    }

    if (callbacks.onRegistration) {
      PushNotifications.addListener("registration", callbacks.onRegistration);
    }

    if (callbacks.onReceived) {
      PushNotifications.addListener("pushNotificationReceived", callbacks.onReceived);
    }

    if (callbacks.onTapped) {
      PushNotifications.addListener("pushNotificationActionPerformed", callbacks.onTapped);
    }

    if (callbacks.onError) {
      PushNotifications.addListener("registrationError", (error) => {
        callbacks.onError?.(error);
      });
    }

    await PushNotifications.register();

    return new Promise((resolve) => {
      PushNotifications.addListener("registration", (token) => {
        resolve(token.value);
      });
      setTimeout(() => resolve(null), 5000);
    });
  } catch (error) {
    console.error("Error initializing push notifications:", error);
    callbacks.onError?.(error);
    return null;
  }
}

export async function removePushListeners(): Promise<void> {
  if (isNative) {
    await PushNotifications.removeAllListeners();
  }
}
