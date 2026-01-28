// In production (DigitalOcean), use VITE_API_BASE_URL env variable
// In development (Replit), use relative /api path
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const CSRF_COOKIE_NAME = "waykel.csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function withCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const token = getCookieValue(CSRF_COOKIE_NAME);
  if (!token) return headers;
  if (headers instanceof Headers) {
    if (!headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, token);
    }
    return headers;
  }
  return {
    [CSRF_HEADER_NAME]: token,
    ...(headers as Record<string, string>),
  } as Record<string, string>;
}

// Global 401 handler - redirects to login when session expires
// Prevents "data vanishing" by forcing re-authentication
let isRedirectingToLogin = false;

function handleUnauthorized() {
  // Prevent multiple redirects
  if (isRedirectingToLogin) return;

  // Don't redirect if already on auth pages
  const currentPath = window.location.pathname;
  if (currentPath.includes('/auth') || currentPath === '/' || currentPath.includes('/forgot-password')) {
    return;
  }

  isRedirectingToLogin = true;
  console.warn('[Auth] Session expired - redirecting to login');

  // Determine which login page based on current path
  let loginPath = '/auth';
  if (currentPath.startsWith('/customer')) {
    loginPath = '/customer/auth';
  }

  // Store current path for redirect after login
  sessionStorage.setItem('redirectAfterLogin', currentPath);

  // Redirect to login
  window.location.href = loginPath;
}

// Session heartbeat - keeps session alive for active users
// Runs every 5 minutes to prevent silent expiry
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startSessionHeartbeat() {
  if (heartbeatInterval) return; // Already running

  heartbeatInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/session`, {
        credentials: "include",
      });

      if (res.status === 401) {
        handleUnauthorized();
      }
    } catch (err) {
      console.warn('[Heartbeat] Session check failed:', err);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  console.log('[Heartbeat] Session keep-alive started');
}

export function stopSessionHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[Heartbeat] Session keep-alive stopped');
  }
}

// Safe fetch wrapper that never throws and always returns consistent shape
// Includes global 401 handling for session expiry
export async function safeFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; ok: boolean }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(withCsrfHeader(options.headers || {}) as Record<string, string>),
      },
      credentials: "include",
    });

    // Handle 401 globally - session expired
    if (res.status === 401) {
      handleUnauthorized();
      return { data: null, error: "Session expired", ok: false };
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data?.error || data?.details || `Request failed with status ${res.status}`;
      console.error(`[API] ${options.method || 'GET'} ${url} failed:`, errorMessage);
      return { data: null, error: errorMessage, ok: false };
    }

    return { data, error: null, ok: true };
  } catch (err: any) {
    console.error(`[API] ${options.method || 'GET'} ${url} error:`, err);
    return { data: null, error: err?.message || "Network error", ok: false };
  }
}

// Safe array helper - always returns an array even if API returns error/null
export function ensureArray<T>(data: T | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  return [data];
}

// Centralized fetch wrapper with 401 handling for all API calls
// This ensures ALL api.* methods handle session expiry consistently
async function apiFetch(
  url: string,
  options: RequestInit = {},
  skipAuthRedirect: boolean = false
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: withCsrfHeader(options.headers || {}),
  });

  // Handle 401 globally unless this is an auth endpoint
  if (res.status === 401 && !skipAuthRedirect) {
    handleUnauthorized();
  }

  return res;
}

export const api = {
  auth: {
    register: async (data: any) => {
      const res = await apiFetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }, true); // Skip auth redirect for register
      return res.json();
    },
    login: async (credentials: { phone?: string; username?: string; password: string }) => {
      const res = await apiFetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      }, true); // Skip auth redirect for login
      const result = await res.json();

      // Start session heartbeat after successful login
      if (res.ok && result && !result.error) {
        startSessionHeartbeat();
      }

      return result;
    },
    logout: async () => {
      stopSessionHeartbeat(); // Stop heartbeat on logout
      const res = await apiFetch(`${API_BASE}/auth/logout`, {
        method: "POST",
      }, true);
      return res.json();
    },
    checkSession: async () => {
      const res = await apiFetch(`${API_BASE}/auth/session`, {}, true); // Skip redirect for session check
      return res.json();
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
      const res = await apiFetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return res.json();
    },
  },
  rides: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await apiFetch(`${API_BASE}/rides?${params}`);
      return res.json();
    },
    get: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/rides/${id}`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await apiFetch(`${API_BASE}/rides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await apiFetch(`${API_BASE}/rides/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    assign: async (id: string, driverId: string, vehicleId: string) => {
      const res = await apiFetch(`${API_BASE}/rides/${id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, vehicleId }),
      });
      return res.json();
    },
    getCheapestBids: async (rideId: string, limit: number = 5) => {
      const res = await apiFetch(`${API_BASE}/rides/${rideId}/cheapest-bids?limit=${limit}`);
      return res.json();
    },
    acceptTrip: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/rides/${id}/accept`, { method: "POST" });
      return res.json();
    },
    startTrip: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/rides/${id}/start`, { method: "PATCH" });
      return res.json();
    },
    markPickupComplete: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/rides/${id}/pickup-complete`, { method: "PATCH" });
      return res.json();
    },
    markDeliveryComplete: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/rides/${id}/delivery-complete`, { method: "PATCH" });
      return res.json();
    },
    completeTrip: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/rides/${id}/complete`, { method: "PATCH" });
      return res.json();
    },
  },
  bids: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await apiFetch(`${API_BASE}/bids?${params}`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await apiFetch(`${API_BASE}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await apiFetch(`${API_BASE}/bids/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
  },
  vehicles: {
    list: async (filters?: any) => {
      if (!filters || Object.keys(filters).length === 0) {
        const res = await apiFetch(`${API_BASE}/vehicles/all`);
        return res.json();
      }
      const params = new URLSearchParams(filters);
      const res = await apiFetch(`${API_BASE}/vehicles?${params}`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await apiFetch(`${API_BASE}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await apiFetch(`${API_BASE}/vehicles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/vehicles/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
  },
  transporters: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await apiFetch(`${API_BASE}/transporters?${params}`);
      return res.json();
    },
    get: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/transporters/${id}`);
      return res.json();
    },
    getPermissions: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/transporters/${id}/permissions`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await apiFetch(`${API_BASE}/transporters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await apiFetch(`${API_BASE}/transporters/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    verify: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/transporters/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return res.json();
    },
    approve: async (id: string, options?: { confirmFromRejected?: boolean }) => {
      const res = await apiFetch(`${API_BASE}/transporters/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options || {}),
      });
      return res.json();
    },
    reject: async (id: string, reason: string, options?: { confirmFromActive?: boolean }) => {
      const res = await apiFetch(`${API_BASE}/transporters/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, ...options }),
      });
      return res.json();
    },
    addDriver: async (data: { name: string; phone: string; email?: string }) => {
      const generatedPassword = Math.random().toString(36).slice(-6).toUpperCase() +
        Math.floor(Math.random() * 90 + 10);

      const res = await apiFetch(`${API_BASE}/transporter/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, password: generatedPassword }),
      });
      const result = await res.json();

      if (!result.error && result.id) {
        return { ...result, credentials: { phone: data.phone, password: generatedPassword } };
      }
      return result;
    },
    resetDriverPassword: async (driverId: string) => {
      const newPassword = Math.random().toString(36).slice(-6).toUpperCase() +
        Math.floor(Math.random() * 90 + 10);

      const res = await apiFetch(`${API_BASE}/users/${driverId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const result = await res.json();

      if (!result.error) {
        return { ...result, newPassword };
      }
      return result;
    },
  },
  drivers: {
    list: async () => {
      const res = await apiFetch(`${API_BASE}/drivers`);
      return res.json();
    },
  },
  users: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await apiFetch(`${API_BASE}/users?${params}`);
      return res.json();
    },
    update: async (id: string, data: { name?: string; email?: string; phone?: string; role?: string }) => {
      const res = await apiFetch(`${API_BASE}/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    resetPassword: async (id: string, newPassword: string) => {
      const res = await apiFetch(`${API_BASE}/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      return res.json();
    },
    updateOnlineStatus: async (id: string, isOnline: boolean) => {
      const res = await apiFetch(`${API_BASE}/users/${id}/online-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline }),
      });
      return res.json();
    },
  },
  documents: {
    list: async (filters?: { userId?: string; vehicleId?: string; transporterId?: string }) => {
      const params = new URLSearchParams(filters as any || {});
      const res = await apiFetch(`${API_BASE}/documents?${params}`, { cache: "no-store" });
      return res.json();
    },
    create: async (data: any) => {
      const res = await apiFetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string, reason?: string) => {
      const res = await apiFetch(`${API_BASE}/documents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      return res.json();
    },
  },
  roles: {
    list: async () => {
      const res = await apiFetch(`${API_BASE}/roles`);
      return res.json();
    },
    create: async (data: { name: string; description?: string; permissions: string[] }) => {
      const res = await apiFetch(`${API_BASE}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: { name?: string; description?: string; permissions?: string[] }) => {
      const res = await apiFetch(`${API_BASE}/roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/roles/${id}`, { method: "DELETE" });
      return res.json();
    },
    getPermissions: async () => {
      const res = await apiFetch(`${API_BASE}/permissions`);
      return res.json();
    },
    getUserRoles: async (userId: string) => {
      const res = await apiFetch(`${API_BASE}/users/${userId}/roles`);
      return res.json();
    },
    assignToUser: async (userId: string, roleId: string) => {
      const res = await apiFetch(`${API_BASE}/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      return res.json();
    },
    removeFromUser: async (userId: string, roleId: string) => {
      const res = await apiFetch(`${API_BASE}/users/${userId}/roles/${roleId}`, { method: "DELETE" });
      return res.json();
    },
  },
  savedAddresses: {
    list: async () => {
      const res = await apiFetch(`${API_BASE}/saved-addresses`);
      return res.json();
    },
    create: async (data: { label: string; address: string; pincode?: string; city?: string; state?: string; addressType?: string }) => {
      const res = await apiFetch(`${API_BASE}/saved-addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await apiFetch(`${API_BASE}/saved-addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/saved-addresses/${id}`, { method: "DELETE" });
      return res.json();
    },
  },
  driverApplications: {
    list: async () => {
      const res = await apiFetch(`${API_BASE}/driver-applications`);
      return res.json();
    },
    get: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/driver-applications/${id}`);
      return res.json();
    },
    getMyApplication: async () => {
      const res = await apiFetch(`${API_BASE}/my-driver-application`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await apiFetch(`${API_BASE}/driver-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await apiFetch(`${API_BASE}/driver-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    withdraw: async (id: string) => {
      const res = await apiFetch(`${API_BASE}/driver-applications/${id}/withdraw`, { method: "POST" });
      return res.json();
    },
    hire: async (id: string, transporterId?: string) => {
      const res = await apiFetch(`${API_BASE}/driver-applications/${id}/hire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transporterId }),
      });
      return res.json();
    },
  },
  tripPosting: {
    create: async (data: any) => {
      const res = await apiFetch(`${API_BASE}/transporter/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },
  vehicleTypes: {
    list: async () => {
      const res = await apiFetch(`${API_BASE}/vehicle-types`);
      return res.json();
    },
  },
};

export const transporterApi = {
  getPermissions: async () => {
    const res = await apiFetch(`${API_BASE}/transporter/permissions`);
    return res.json();
  },
  getBidEligibility: async (transporterId: string) => {
    if (!transporterId) {
      throw new Error("transporterId is required for eligibility lookup");
    }

    // Authoritative eligibility endpoint
    const res = await apiFetch(`${API_BASE}/transporters/${transporterId}/eligibility`);
    return res.json();
  },
};
