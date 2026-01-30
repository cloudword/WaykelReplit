import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "wouter";
import {
  waykelApi,
  WaykelUser,
  setAuthToken,
  getStoredUser,
  clearAuthData,
  updateLastActivity,
  isTokenExpired,
} from "./waykelApi";
import { trackLogin, trackRegistration } from "./customerTracking";

interface AuthContextType {
  user: WaykelUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WaykelUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const refresh = useCallback(async () => {
    try {
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const trackActivity = () => {
      // Only track if we have a user
      const currentUser = getStoredUser();
      if (currentUser) {
        updateLastActivity();
      }
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(event => {
      window.addEventListener(event, trackActivity, { passive: true });
    });

    const sessionCheckInterval = setInterval(() => {
      if (isTokenExpired()) {
        setUser(null);
        clearAuthData();
      }
    }, 60000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, trackActivity);
      });
      clearInterval(sessionCheckInterval);
    };
  }, [refresh]);

  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return phone;
  };

  const login = async (phone: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const formattedPhone = formatPhone(phone);
      const response = await waykelApi.auth.login({ phone: formattedPhone, password }) as any;
      const userData = (response as any).user || response;
      const token = (response as any).token;

      if (userData && userData.id) {
        if (token) {
          setAuthToken(token, userData);
        }
        setUser(userData);
        trackLogin({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
        });
        return { success: true };
      }
      return { success: false, error: "Login failed" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return { success: false, error: message };
    }
  };

  const register = async (data: { name: string; email: string; phone: string; password: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const formattedPhone = formatPhone(data.phone);
      const response = await waykelApi.auth.register({
        name: data.name,
        email: data.email,
        phone: formattedPhone,
        password: data.password,
        role: "customer",
      }) as any;

      const userData = (response as any).user || response;
      const token = (response as any).token;

      if (userData && userData.id) {
        if (token) {
          setAuthToken(token, userData);
        }
        setUser(userData);
        trackRegistration({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
        });
        return { success: true };
      }

      return { success: false, error: "Registration failed" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await waykelApi.auth.logout();
    } catch {
      // ignore
    } finally {
      clearAuthData();
      setUser(null);
      setLocation("/customer");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
