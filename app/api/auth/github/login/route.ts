/**
 * GitHub OAuth login initiation endpoint.
 * Redirects users to GitHub's authorization page.
 */
import { NextRequest, NextResponse } from "next/server";
import { getOAuthApp, getCallbackUrl } from "@/lib/auth/oauth-app";

export async function GET(request: NextRequest) {
  try {
    const oauthApp = getOAuthApp();
    const callbackUrl = getCallbackUrl();
    
    // Get the redirect URL (where to send user after they return from GitHub)
    const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";
    
    // Generate the GitHub authorization URL
    const { url } = oauthApp.getWebFlowAuthorizationUrl({
      redirectUrl: callbackUrl,
      scopes: ["admin:org", "user", "manage_billing:enterprise", "read:enterprise", "manage_billing:copilot"],
      state: returnTo, // Pass returnTo URL in state parameter
    });
    
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth initialization failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
