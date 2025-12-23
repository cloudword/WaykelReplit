import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AdminSessionPayload {
  authenticated: boolean;
  user: Record<string, any> | null;
}

interface AdminGateState {
  isChecking: boolean;
  isReady: boolean;
  error: string | null;
  user: Record<string, any> | null;
}

let cachedSession: AdminSessionPayload | null = null;
let inflightPromise: Promise<AdminSessionPayload> | null = null;
let lastError: string | null = null;
let hasRedirected = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function requireBrowserContext() {
  if (typeof window === "undefined") {
    throw new Error("Admin session is only available in the browser context");
  }
}

async function performSessionCheck(): Promise<AdminSessionPayload> {
  requireBrowserContext();

  const storedUserRaw = window.localStorage.getItem("currentUser");
  if (!storedUserRaw) {
    throw new Error("Please log in to continue");
  }

  let storedUser: Record<string, any> | null = null;
  try {
    storedUser = JSON.parse(storedUserRaw);
  } catch {
    storedUser = null;
  }

  if (!storedUser || storedUser.role !== "admin") {
    throw new Error("Admin access required");
  }

  const session = await api.auth.checkSession();
  if (!session?.authenticated || session?.user?.role !== "admin") {
    throw new Error("Admin session not ready");
  }

  window.localStorage.setItem("currentUser", JSON.stringify(session.user));
  return session;
}

export async function ensureAdminSessionReady(): Promise<AdminSessionPayload> {
  if (cachedSession) {
    return cachedSession;
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  lastError = null;
  inflightPromise = performSessionCheck()
    .then((session) => {
      cachedSession = session;
      lastError = null;
      notify();
      return session;
    })
    .catch((error) => {
      cachedSession = null;
      lastError = error?.message || "Failed to verify admin session";
      notify();
      throw error;
    })
    .finally(() => {
      inflightPromise = null;
    });

  return inflightPromise;
}

function redirectToLogin() {
  requireBrowserContext();
  if (hasRedirected) return;
  hasRedirected = true;
  sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
  window.location.href = "/auth";
}

function getSnapshot(): AdminGateState {
  return {
    isChecking: !cachedSession && !lastError,
    isReady: Boolean(cachedSession),
    error: lastError,
    user: cachedSession?.user ?? null,
  };
}

export function useAdminSessionGate(options?: { redirectOnFail?: boolean }) {
  const redirectOnFail = options?.redirectOnFail ?? true;
  const [state, setState] = useState<AdminGateState>(() => getSnapshot());

  useEffect(() => {
    let active = true;

    const handleUpdate = () => {
      if (!active) return;
      const snapshot = getSnapshot();
      setState(snapshot);
      if (snapshot.error && redirectOnFail) {
        redirectToLogin();
      }
    };

    listeners.add(handleUpdate);

    ensureAdminSessionReady().catch(() => {
      // Error state handled via listeners + redirect logic
    });

    handleUpdate();

    return () => {
      active = false;
      listeners.delete(handleUpdate);
    };
  }, [redirectOnFail]);

  return state;
}

export function resetAdminSessionCache() {
  cachedSession = null;
  lastError = null;
  hasRedirected = false;
}
