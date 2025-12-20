import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global 401 handler - redirects to login when session expires
function handleUnauthorized() {
  const currentPath = window.location.pathname;
  
  // Don't redirect if already on auth pages
  if (currentPath.includes('/auth') || currentPath === '/' || currentPath.includes('/forgot-password')) {
    return;
  }
  
  console.warn('[QueryClient] Session expired - redirecting to login');
  
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

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 globally for session expiry
    if (res.status === 401) {
      handleUnauthorized();
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      if (unauthorizedBehavior === "redirect") {
        handleUnauthorized();
        return null;
      }
      // "throw" behavior - will be caught by throwIfResNotOk
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
