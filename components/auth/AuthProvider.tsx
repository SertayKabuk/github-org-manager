"use client";

import { createContext, useContext, useEffect, useState } from "react";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scopes, setScopes] = useState<string[]>([]);
  const [loginType, setLoginType] = useState<LoginType>(null);

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/github/me");
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
        setScopes(data.scopes || []);
        setLoginType(data.loginType || null);
      } else {
        setUser(null);
        setScopes([]);
        setLoginType(null);
      }
    } catch (error) {
      console.error("Failed to fetch auth status:", error);
      setUser(null);
      setScopes([]);
      setLoginType(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const adminLogin = (returnTo?: string) => {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    window.location.href = `/api/auth/github/admin/login${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const userLogin = (returnTo?: string) => {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    window.location.href = `/api/auth/github/user/login${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/github/logout", { method: "POST" });
      setUser(null);
      setScopes([]);
      setLoginType(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshAuth = async () => {
    setIsLoading(true);
    await fetchAuthStatus();
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
