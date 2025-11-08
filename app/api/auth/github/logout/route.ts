/**
 * Logout endpoint.
 * Clears the session and redirects to home.
 */
import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/helpers";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await clearSession();
    return NextResponse.redirect(new URL("/", getAppUrl()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
