/**
 * Waykel API Client for Customer Portal
 * 
 * Copy this file to your customer portal project and configure the API_BASE_URL
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_WAYKEL_API_URL || process.env.VITE_WAYKEL_API_URL || '';

interface ApiError {
  error: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isOnline?: boolean;
  rating?: string;
  totalTrips?: number;
  createdAt?: string;
}

interface Ride {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  dropTime?: string;
  date: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'scheduled' | 'bid_placed';
  price: string;
  distance: string;
  cargoType: string;
  weight: string;
  customerName?: string;
  customerPhone?: string;
  incentive?: string;
  transporterId?: string;
  assignedDriverId?: string;
  assignedVehicleId?: string;
  createdById?: string;
  createdAt?: string;
}

interface Bid {
  id: string;
  rideId: string;
  userId: string;
  transporterId?: string;
  vehicleId: string;
  amount: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: string;
}

interface CreateRideData {
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  date: string;
  price: string;
  distance: string;
  cargoType: string;
  weight: string;
  customerName?: string;
  customerPhone?: string;
  createdById?: string;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface SessionResponse {
  authenticated: boolean;
  user?: {
    id: string;
    role: string;
    isSuperAdmin?: boolean;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const waykelApi = {
  // Health check
  health: async (): Promise<{ status: string; database: string }> => {
    const response = await fetch(`${API_BASE_URL}/health`, {
      credentials: 'include',
    });
    return handleResponse(response);
  },

  auth: {
    register: async (data: RegisterData): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, role: 'customer' }),
      });
      return handleResponse(response);
    },

    login: async (phone: string, password: string): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, password }),
      });
      return handleResponse(response);
    },

    logout: async (): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      return handleResponse(response);
    },

    getSession: async (): Promise<SessionResponse> => {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        credentials: 'include',
      });
      return handleResponse(response);
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean }> => {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return handleResponse(response);
    },
  },

  rides: {
    create: async (data: CreateRideData): Promise<Ride> => {
      const response = await fetch(`${API_BASE_URL}/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    getById: async (id: string): Promise<Ride> => {
      const response = await fetch(`${API_BASE_URL}/rides/${id}`, {
        credentials: 'include',
      });
      return handleResponse(response);
    },

    getCustomerRides: async (customerId: string): Promise<Ride[]> => {
      const response = await fetch(`${API_BASE_URL}/rides?createdById=${customerId}`, {
        credentials: 'include',
      });
      return handleResponse(response);
    },

    cancel: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`${API_BASE_URL}/rides/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' }),
      });
      return handleResponse(response);
    },
  },

  bids: {
    getForRide: async (rideId: string): Promise<Bid[]> => {
      const response = await fetch(`${API_BASE_URL}/bids?rideId=${rideId}`, {
        credentials: 'include',
      });
      return handleResponse(response);
    },

    accept: async (bidId: string): Promise<{ success: boolean }> => {
      const response = await fetch(`${API_BASE_URL}/bids/${bidId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'accepted' }),
      });
      return handleResponse(response);
    },

    reject: async (bidId: string): Promise<{ success: boolean }> => {
      const response = await fetch(`${API_BASE_URL}/bids/${bidId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'rejected' }),
      });
      return handleResponse(response);
    },
  },
};

export type { User, Ride, Bid, CreateRideData, RegisterData, SessionResponse };
