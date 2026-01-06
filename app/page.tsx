'use client';

import { Github, LogIn, Mail, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Home() {
  const { isAuthenticated, isLoading, user, userLogin } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Skeleton className="h-20 w-20 rounded-full mb-6" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  // Show thank you page after user login
  if (isAuthenticated && user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Thank You!</h1>
        <p className="text-muted-foreground mb-4 max-w-md">
          Your GitHub account has been linked successfully.
        </p>

        <Card className="mt-8 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Github className="h-5 w-5" />
              Account Linked
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="h-12 w-12 rounded-full"
              />
              <div className="text-left">
                <p className="font-medium">{user.name || user.login}</p>
                <p className="text-sm text-muted-foreground">@{user.login}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your email addresses have been recorded and linked to your GitHub username.
              You can close this page now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login prompt if not authenticated
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
        <Github className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">GitHub Account Verification</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Sign in with your GitHub account to verify your identity and link your email address.
      </p>
      <Button onClick={() => userLogin()} size="lg">
        <LogIn className="mr-2 h-5 w-5" />
        Login with GitHub
      </Button>
      <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-2xl">
        <Card className="text-left">
          <CardHeader>
            <Mail className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Email Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We link your GitHub verified emails to your username for identification.
            </p>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardHeader>
            <Github className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Quick & Secure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              One-click login using GitHub OAuth. We only access your email addresses.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
