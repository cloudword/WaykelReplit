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
      const params = new URLSearchParams(filters || {});
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
    updateOnlineStatus: async (id: string, isOnline: boolean) => {
      const res = await fetch(`${API_BASE}/users/${id}/online-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline }),
      });
      return res.json();
    },
  },
};
