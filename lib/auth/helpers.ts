/**
 * Helper functions for API routes that require authentication.
 */
import { NextResponse } from "next/server";
import { isAuthenticated } from "./session";

/**
 * Get the application URL from environment (runtime-configurable).
 * Falls back to localhost:3000 if not set.
 */
export function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
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
