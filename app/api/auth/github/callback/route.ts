/**
 * GitHub OAuth callback endpoint.
 * Handles the redirect from GitHub after user authorization.
 */
import { NextRequest, NextResponse } from "next/server";
import { getOAuthApp } from "@/lib/auth/oauth-app";
import { saveSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/helpers";
import { Octokit } from "octokit";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // returnTo URL
    
    if (!code) {
      const appUrl = getAppUrl();
      return NextResponse.redirect(
        new URL("/?error=missing_code", appUrl)
      );
    }
    
    const oauthApp = getOAuthApp();
    
    // Exchange the code for an access token
    const { authentication } = await oauthApp.createToken({
      code,
    });
    
    // Get user information using the access token
    const userOctokit = new Octokit({ auth: authentication.token });
    const { data: user } = await userOctokit.rest.users.getAuthenticated();
    
    // Save to session
    await saveSession(
      authentication.token,
      {
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
        name: user.name,
      }
    );
    
    // Redirect to the original destination or home
    const returnTo = state || "/";
    const appUrl = getAppUrl();
    const redirectUrl = new URL(returnTo, appUrl);
        
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[OAuth Callback] Error:", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    const appUrl = getAppUrl();
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, appUrl)
    );
  }
}
