const API_BASE = "/api";

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
      const res = await fetch(`${API_BASE}/rides?${params}`);
      return res.json();
    },
    get: async (id: string) => {
      const res = await fetch(`${API_BASE}/rides/${id}`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/rides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/rides/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    assign: async (id: string, driverId: string, vehicleId: string) => {
      const res = await fetch(`${API_BASE}/rides/${id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, vehicleId }),
      });
      return res.json();
    },
    getCheapestBids: async (rideId: string, limit: number = 5) => {
      const res = await fetch(`${API_BASE}/rides/${rideId}/cheapest-bids?limit=${limit}`);
      return res.json();
    },
  },
  bids: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await fetch(`${API_BASE}/bids?${params}`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/bids/${id}/status`, {
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
        const res = await fetch(`${API_BASE}/vehicles/all`);
        return res.json();
      }
      const params = new URLSearchParams(filters);
      const res = await fetch(`${API_BASE}/vehicles?${params}`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },
  transporters: {
    list: async (filters?: any) => {
      const params = new URLSearchParams(filters || {});
      const res = await fetch(`${API_BASE}/transporters?${params}`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/transporters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/transporters/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
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
        body: JSON.stringify({ isOnline }),
      });
      return res.json();
    },
  },
  documents: {
    list: async (filters?: { userId?: string; vehicleId?: string; transporterId?: string }) => {
      const params = new URLSearchParams(filters as any || {});
      const res = await fetch(`${API_BASE}/documents?${params}`);
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    updateStatus: async (id: string, status: string) => {
      const res = await fetch(`${API_BASE}/documents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
  },
};
