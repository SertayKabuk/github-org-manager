"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface User {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (returnTo?: string) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/github/me");
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch auth status:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthStatus();
  }, []);

  const login = (returnTo?: string) => {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    window.location.href = `/api/auth/github/login${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/github/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const refreshAuth = async () => {
    setIsLoading(true);
    await fetchAuthStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
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
