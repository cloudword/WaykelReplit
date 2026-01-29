import { CUSTOMER_API_BASE } from "../config/api";

// JWT token storage keys
// JWT token storage keys - Aligned with main app (lib/api.ts)
const STORAGE_KEY = "currentUser";
const TOKEN_EXPIRY_KEY = "waykel_token_expiry";
const LAST_ACTIVITY_KEY = "waykel_last_activity";

// Session timeout in milliseconds (fallback if JWT has no expiry - 1 hour for customers)
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// Inactivity timeout in milliseconds (30 minutes - logout if no user activity)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function parseJwtExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiryStr) return true;
  const expiry = parseInt(expiryStr, 10);
  return Date.now() >= expiry;
}

export function isSessionInactive(): boolean {
  if (INACTIVITY_TIMEOUT_MS <= 0) return false;
  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivityStr) return true;
  const lastActivity = parseInt(lastActivityStr, 10);
  return Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;
}

export function updateLastActivity(): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const { token } = JSON.parse(stored);
    if (!token) return null;

    if (isTokenExpired()) {
      clearAuthData();
      return null;
    }

    if (isSessionInactive()) {
      clearAuthData();
      return null;
    }

    return token;
  } catch (e) {
    return null;
  }
}

export function getStoredUser(): WaykelUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const { user } = JSON.parse(stored);
    return user || null;
  } catch (e) {
    return null;
  }
}

export function setAuthToken(token: string, user: WaykelUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));

  const expiry = parseJwtExpiry(token);
  if (expiry) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  } else {
    // Default 1h expiry if none in JWT
    localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + SESSION_TIMEOUT_MS).toString());
  }

  updateLastActivity();
}

export function clearAuthData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export interface WaykelUser {
  id: string;
  customerId?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  token?: string;
  tokenType?: string;
  expiresIn?: string;
}

export interface WaykelRide {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  date: string;
  price: number;
  distance: number;
  cargoType: string;
  weight: number;
  vehicleType?: string;
  status: string;
  bidCount?: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  transporter?: {
    id: string;
    transporterId?: string;
    name: string;
    phone?: string;
    rating?: number;
    isVerified?: boolean;
    verificationStatus?: "verified" | "pending" | "unverified";
  };
  driver?: {
    id: string;
    driverId?: string;
    name: string;
    phone?: string;
    isSelfDriver: boolean;
    documentStatus?: "complete" | "pending" | "incomplete";
    licenseVerified?: boolean;
  };
  vehicle?: {
    id: string;
    vehicleId?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    rcStatus?: "verified" | "pending" | "unverified";
  };
}

export interface WaykelBid {
  id: string;
  rideId: string;
  transporterId: string;
  amount: number;
  status: string;
  createdAt: string;
  ride?: WaykelRide;
  transporter?: {
    id: string;
    transporterId?: string;
    name: string;
    phone: string;
    rating?: number;
    isVerified?: boolean;
    verificationStatus?: "verified" | "pending" | "unverified";
  };
}

export interface WaykelCustomer {
  id: string;
  customerId?: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface WaykelBooking {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  date: string;
  status: string;
  price: number;
  customer?: WaykelCustomer;
  createdAt: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "customer";
}

export interface LoginData {
  phone: string;
  password: string;
}

export interface CreateRideData {
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  date: string;
  price: string;
  distance: string;
  cargoType: string;
  weight: string;
  createdById?: string;
}

export interface SavedAddress {
  id: string;
  customerId: string;
  label: string;
  street: string;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  addressType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressData {
  label: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
  addressType?: string;
}

async function fetchLocalApi<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuthRedirect = false
): Promise<T> {
  const url = `${CUSTOMER_API_BASE}/api/customer${endpoint}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>) || {},
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await response.text();

  if (!response.ok) {
    if (response.status === 401 && !skipAuthRedirect) {
      clearAuthData();
      throw new Error("Session expired. Please log in again.");
    }
    let message = `Request failed: ${response.status}`;
    try {
      const errorJson = JSON.parse(text);
      message = errorJson.message || errorJson.error || message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const waykelApi = {
  auth: {
    register: (data: RegisterData) =>
      fetchLocalApi<WaykelUser>("/register", {
        method: "POST",
        body: JSON.stringify(data),
      }, true),

    login: (data: LoginData) =>
      fetchLocalApi<WaykelUser>("/login", {
        method: "POST",
        body: JSON.stringify(data),
      }, true),

    logout: () =>
      fetchLocalApi<{ success: boolean }>("/logout", { method: "POST" }),

    forgotPassword: {
      requestOtp: (phone: string) =>
        fetchLocalApi<{ success: boolean; message: string; testMode?: boolean }>("/forgot-password/request-otp", {
          method: "POST",
          body: JSON.stringify({ phone }),
        }),

      verifyOtp: (phone: string, code: string) =>
        fetchLocalApi<{ success: boolean; message: string }>("/forgot-password/verify-otp", {
          method: "POST",
          body: JSON.stringify({ phone, code }),
        }),

      resetPassword: (phone: string, newPassword: string) =>
        fetchLocalApi<{ success: boolean; message: string }>("/forgot-password/reset", {
          method: "POST",
          body: JSON.stringify({ phone, newPassword }),
        }),
    },

    requestOtp: (phone: string) =>
      fetchLocalApi<{ success: boolean; message: string }>("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      }, true),

    verifyOtp: (phone: string, code: string) =>
      fetchLocalApi<{ success: boolean; message: string; token?: string; user?: WaykelUser }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      }, true),
  },

  rides: {
    getMyRides: () => fetchLocalApi<WaykelRide[]>("/rides"),
    createRide: (data: CreateRideData) =>
      fetchLocalApi<WaykelRide>("/rides", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  bids: {
    getBidsForRide: (rideId: string) =>
      fetchLocalApi<WaykelBid[]>(`/rides/${rideId}/bids`),

    acceptBid: (bidId: string) =>
      fetchLocalApi<WaykelBid>(`/bids/${bidId}/accept`, { method: "POST" }),
  },

  addresses: {
    getSavedAddresses: () => fetchLocalApi<SavedAddress[]>("/addresses"),

    createAddress: (data: CreateAddressData) =>
      fetchLocalApi<SavedAddress>("/addresses", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateAddress: (id: string, data: Partial<CreateAddressData>) =>
      fetchLocalApi<SavedAddress>(`/addresses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    deleteAddress: (id: string) =>
      fetchLocalApi<{ success: boolean }>(`/addresses/${id}`, { method: "DELETE" }),
  },
};
