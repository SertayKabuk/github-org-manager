/**
 * Authentication status endpoint.
 * Returns current user data if authenticated.
 */
import { NextResponse } from "next/server";
import { getUser, isAuthenticated } from "@/lib/auth/session";

export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    
    if (!authenticated) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }
    
    const user = await getUser();
    
    return NextResponse.json(
      { authenticated: true, user },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check authentication";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
