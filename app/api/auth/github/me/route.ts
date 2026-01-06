/**
 * Authentication status endpoint.
 * Returns current user data, scopes, and login type if authenticated.
 */
import { NextResponse } from "next/server";
import { getSession, isAuthenticated } from "@/lib/auth/session";

export async function GET() {
  try {
    const authenticated = await isAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        { authenticated: false, user: null, scopes: null, loginType: null },
        { status: 200 }
      );
    }

    const session = await getSession();

    return NextResponse.json(
      {
        authenticated: true,
        user: session.user,
        scopes: session.scopes || [],
        loginType: session.loginType || null,
      },
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
