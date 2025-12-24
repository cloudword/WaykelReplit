import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

export function useTransporterSessionGate() {
  const { data, isLoading, error } = useQuery<{ user?: any }>({
    queryKey: ["session", "transporter"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth/session`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to verify session");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const rawUser = data?.user;
  const isTransporter = rawUser?.role === "transporter";
  const user = isTransporter ? rawUser : null;
  const isReady = Boolean(isTransporter);
  const roleMismatch = Boolean(rawUser && !isTransporter);

  return {
    user,
    isReady,
    isChecking: isLoading,
    error: error ? (error as Error).message : null,
    roleMismatch,
  };
}
