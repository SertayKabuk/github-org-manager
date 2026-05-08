"use client";

import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { withBasePath } from "@/lib/utils";

interface User {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
}

type LoginType = 'admin' | 'user' | null;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  scopes: string[];
  loginType: LoginType;
  isAdmin: boolean;
  adminLogin: (returnTo?: string) => void;
  userLogin: (returnTo?: string) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthStatusResponse {
  authenticated: boolean;
  user?: User | null;
  scopes?: string[];
  loginType?: LoginType;
}

interface AuthState {
  user: User | null;
  scopes: string[];
  loginType: LoginType;
}

const EMPTY_AUTH_STATE: AuthState = {
  user: null,
  scopes: [],
  loginType: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const authStatusQuery = useQuery({
    queryKey: ["auth-status"],
    queryFn: async (): Promise<AuthState> => {
      try {
        const response = await fetch(withBasePath("/api/auth/github/me"));
        const data = (await response.json()) as AuthStatusResponse;

        if (data.authenticated && data.user) {
          return {
            user: data.user,
            scopes: data.scopes ?? [],
            loginType: data.loginType ?? null,
          };
        }

        return EMPTY_AUTH_STATE;
      } catch (error) {
        console.error("Failed to fetch auth status:", error);
        return EMPTY_AUTH_STATE;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const user = authStatusQuery.data?.user ?? null;
  const scopes = authStatusQuery.data?.scopes ?? EMPTY_AUTH_STATE.scopes;
  const loginType = authStatusQuery.data?.loginType ?? EMPTY_AUTH_STATE.loginType;
  const isLoading = authStatusQuery.isLoading;

  const adminLogin = (returnTo?: string) => {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    const path = `/api/auth/github/admin/login${params.toString() ? `?${params.toString()}` : ""}`;
    window.location.href = withBasePath(path);
  };

  const userLogin = (returnTo?: string) => {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    const path = `/api/auth/github/user/login${params.toString() ? `?${params.toString()}` : ""}`;
    window.location.href = withBasePath(path);
  };

  const logout = async () => {
    try {
      await fetch(withBasePath("/api/auth/github/logout"), { method: "POST" });
      queryClient.setQueryData(["auth-status"], EMPTY_AUTH_STATE);
      window.location.href = withBasePath("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshAuth = async () => {
    await authStatusQuery.refetch();
  };

  const isAdmin = loginType === 'admin' || scopes.includes('admin:org');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        scopes,
        loginType,
        isAdmin,
        adminLogin,
        userLogin,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
