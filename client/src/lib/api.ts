// In production (DigitalOcean), use VITE_API_BASE_URL env variable
// In development (Replit), use relative /api path
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = {
  auth: {
    register: async (data: any) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    login: async (credentials: { phone?: string; username?: string; password: string }) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      return res.json();
    },
    logout: async () => {
      const res = await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      return res.json();
    },
    checkSession: async () => {
      const res = await fetch(`${API_BASE}/auth/session`, {
        credentials: "include",
      });
      return res.json();
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return res.json();
    },
  },
  rides: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await fetch(`${API_BASE}/rides?${params}`, {
        credentials: "include",
      });
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`${API_BASE}/rides/${id}`, {
        credentials: "include",
      });
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/rides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/rides/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    assign: async (id: string, driverId: string, vehicleId: string) => {
      const res = await fetch(`${API_BASE}/rides/${id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ driverId, vehicleId }),
      });
      return res.json();
    },
    getCheapestBids: async (rideId: string, limit: number = 5) => {
      const res = await fetch(`${API_BASE}/rides/${rideId}/cheapest-bids?limit=${limit}`, {
        credentials: "include",
      });
      return res.json();
    },
  },
  bids: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await fetch(`${API_BASE}/bids?${params}`, {
        credentials: "include",
      });
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/bids/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
  },
  vehicles: {
    list: async (filters?: any) => {
      if (!filters || Object.keys(filters).length === 0) {
        const res = await fetch(`${API_BASE}/vehicles/all`, {
          credentials: "include",
        });
        return res.json();
      }
      const params = new URLSearchParams(filters);
      const res = await fetch(`${API_BASE}/vehicles?${params}`, {
        credentials: "include",
      });
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },
  transporters: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await fetch(`${API_BASE}/transporters?${params}`, {
        credentials: "include",
      });
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`${API_BASE}/transporters/${id}`, {
        credentials: "include",
      });
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/transporters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/transporters/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    verify: async (id: string) => {
      const res = await fetch(`${API_BASE}/transporters/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      return res.json();
    },
    approve: async (id: string, options?: { confirmFromRejected?: boolean }) => {
      const res = await fetch(`${API_BASE}/transporters/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(options || {}),
      });
      return res.json();
    },
    reject: async (id: string, reason: string, options?: { confirmFromActive?: boolean }) => {
      const res = await fetch(`${API_BASE}/transporters/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason, ...options }),
      });
      return res.json();
    },
    addDriver: async (data: { name: string; phone: string; email?: string }) => {
      const res = await fetch(`${API_BASE}/transporter/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },
  drivers: {
    list: async () => {
      const res = await fetch(`${API_BASE}/drivers`, {
        credentials: "include",
      });
      return res.json();
    },
  },
  users: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await fetch(`${API_BASE}/users?${params}`, {
        credentials: "include",
      });
      return res.json();
    },
    update: async (id: string, data: { name?: string; email?: string; phone?: string; role?: string }) => {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    resetPassword: async (id: string, newPassword: string) => {
      const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      return res.json();
    },
    updateOnlineStatus: async (id: string, isOnline: boolean) => {
      const res = await fetch(`${API_BASE}/users/${id}/online-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isOnline }),
      });
      return res.json();
    },
  },
  documents: {
    list: async (filters?: { userId?: string; vehicleId?: string; transporterId?: string }) => {
      const params = new URLSearchParams(filters as any || {});
      const res = await fetch(`${API_BASE}/documents?${params}`, {
        credentials: "include",
      });
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string, reason?: string) => {
      const res = await fetch(`${API_BASE}/documents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, reason }),
      });
      return res.json();
    },
  },
  roles: {
    list: async () => {
      const res = await fetch(`${API_BASE}/roles`, { credentials: "include" });
      return res.json();
    },
    create: async (data: { name: string; description?: string; permissions: string[] }) => {
      const res = await fetch(`${API_BASE}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: { name?: string; description?: string; permissions?: string[] }) => {
      const res = await fetch(`${API_BASE}/roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/roles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      return res.json();
    },
    getPermissions: async () => {
      const res = await fetch(`${API_BASE}/permissions`, { credentials: "include" });
      return res.json();
    },
    getUserRoles: async (userId: string) => {
      const res = await fetch(`${API_BASE}/users/${userId}/roles`, { credentials: "include" });
      return res.json();
    },
    assignToUser: async (userId: string, roleId: string) => {
      const res = await fetch(`${API_BASE}/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ roleId }),
      });
      return res.json();
    },
    removeFromUser: async (userId: string, roleId: string) => {
      const res = await fetch(`${API_BASE}/users/${userId}/roles/${roleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      return res.json();
    },
  },
  savedAddresses: {
    list: async () => {
      const res = await fetch(`${API_BASE}/saved-addresses`, { credentials: "include" });
      return res.json();
    },
    create: async (data: { label: string; address: string; pincode?: string; city?: string; state?: string; addressType?: string }) => {
      const res = await fetch(`${API_BASE}/saved-addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE}/saved-addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/saved-addresses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      return res.json();
    },
  },
  driverApplications: {
    list: async () => {
      const res = await fetch(`${API_BASE}/driver-applications`, { credentials: "include" });
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`${API_BASE}/driver-applications/${id}`, { credentials: "include" });
      return res.json();
    },
    getMyApplication: async () => {
      const res = await fetch(`${API_BASE}/my-driver-application`, { credentials: "include" });
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/driver-applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    update: async (id: string, data: any) => {
      const res = await fetch(`${API_BASE}/driver-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    withdraw: async (id: string) => {
      const res = await fetch(`${API_BASE}/driver-applications/${id}/withdraw`, {
        method: "POST",
        credentials: "include",
      });
      return res.json();
    },
    hire: async (id: string, transporterId?: string) => {
      const res = await fetch(`${API_BASE}/driver-applications/${id}/hire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ transporterId }),
      });
      return res.json();
    },
  },
  tripPosting: {
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/transporter/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },
  vehicleTypes: {
    list: async () => {
      const res = await fetch(`${API_BASE}/vehicle-types`, { credentials: "include" });
      return res.json();
    },
  },
};
