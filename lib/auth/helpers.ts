/**
 * Helper functions for API routes that require authentication.
 */
import { NextResponse } from "next/server";
import { isAuthenticated, getSession } from "./session";

/**
 * Get the application URL from environment (runtime-configurable).
 * Falls back to localhost:3000 if not set.
 * 
 * IMPORTANT: In production, you MUST set the APP_URL environment variable
 * to your deployed application URL (e.g., https://your-app.vercel.app)
 */
export function getAppUrl(): string {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    console.warn(
      "⚠️  APP_URL environment variable is not set. Using localhost:3000. " +
      "For production deployments, set APP_URL to your deployment URL."
    );
    return "http://localhost:3000";
  }

  return appUrl;
}

/**
 * Checks if the request is authenticated.
 * Returns an error response if not authenticated.
 */
export async function requireAuth() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { error: "Authentication required. Please login with GitHub." },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Checks if the request is from an admin user.
 * Returns an error response if not authenticated or not an admin.
 */
export async function requireAdmin() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { error: "Authentication required. Please login with GitHub." },
      { status: 401 }
    );
  }

  const session = await getSession();

  // Check if user has admin login type or admin:org scope
  const isAdmin = session.loginType === 'admin' ||
    (session.scopes && session.scopes.includes('admin:org'));

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin access required. Please login with admin privileges." },
      { status: 403 }
    );
  }

  return null;
}

