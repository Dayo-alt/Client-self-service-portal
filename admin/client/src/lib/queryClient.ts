import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getIdToken } from "./firebase";

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || "http://localhost:5000";

function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  // Ensure single slash join: API_BASE + url
  const base = API_BASE.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Firebase auth token
  try {
    const token = await getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  } catch (error) {
    console.warn("Could not get Firebase ID token:", error);
  }

  const res = await fetch(resolveUrl(url), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    // No cookies needed; omit credentials to simplify CORS
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add Firebase auth token
    try {
      const token = await getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (error) {
      console.warn("Could not get Firebase ID token:", error);
    }

    const res = await fetch(resolveUrl(queryKey.join("/") as string), {
      headers,
      // No cookies needed; omit credentials to simplify CORS
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
