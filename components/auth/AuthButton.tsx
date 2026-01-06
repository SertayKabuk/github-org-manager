"use client";

import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut } from "lucide-react";

export function AuthButton() {
  const { user, isAuthenticated, isLoading, userLogin, logout } = useAuth();

  if (isLoading) {
    return (
      <Button variant="ghost" disabled>
        Loading...
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button onClick={() => userLogin()} variant="default">
        <LogIn className="mr-2 h-4 w-4" />
        Login with GitHub
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatar_url} alt={user?.login} />
          <AvatarFallback>{user?.login?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{user?.login}</span>
      </div>
      <Button onClick={() => logout()} variant="ghost" size="sm">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
