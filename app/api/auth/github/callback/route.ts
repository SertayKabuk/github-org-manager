/**
 * GitHub OAuth callback endpoint.
 * Handles the redirect from GitHub after user authorization.
 * Supports both admin and user login types.
 */
import { NextRequest, NextResponse } from "next/server";
import { getOAuthApp } from "@/lib/auth/oauth-app";
import { saveSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/auth/helpers";
import { Octokit } from "octokit";
import * as emailMappingRepository from "@/lib/repositories/email-mapping-repository";
import { withBasePath } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state") || ""; // Format: "admin:/path" or "user:/path"

    if (!code) {
      const appUrl = getAppUrl();
      return NextResponse.redirect(
        new URL(withBasePath("/?error=missing_code"), appUrl)
      );
    }

    // Parse state to get login type and return URL
    const [loginType, ...returnToParts] = state.split(":");
    const returnTo = returnToParts.join(":") || (loginType === "admin" ? "/admin" : "/");
    const validLoginType = loginType === "admin" ? "admin" : "user";

    const oauthApp = getOAuthApp();

    // Exchange the code for an access token
    const { authentication } = await oauthApp.createToken({
      code,
    });

    // Get user information using the access token
    const userOctokit = new Octokit({ auth: authentication.token });
    const { data: user } = await userOctokit.rest.users.getAuthenticated();

    // For user login, fetch emails and store mappings
    if (validLoginType === "user") {
      try {
        const { data: emails } = await userOctokit.rest.users.listEmailsForAuthenticatedUser();

        // Store all verified emails in the database
        const mappings = emails
          .filter(email => email.verified)
          .map(email => ({
            github_username: user.login,
            github_user_id: user.id,
            email: email.email,
            is_primary: email.primary,
          }));

        if (mappings.length > 0) {
          await emailMappingRepository.upsertMany(mappings);
        }
      } catch (emailError) {
        console.error("[OAuth Callback] Error fetching emails:", emailError);
        // Continue anyway - user login still succeeds
      }
    }

    // Get scopes from token (basic detection based on login type)
    const scopes = validLoginType === "admin"
      ? ["admin:org", "user", "manage_billing:enterprise", "read:enterprise", "manage_billing:copilot"]
      : ["user:email"];

    // Save to session with login type and scopes
    await saveSession(
      authentication.token,
      {
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
        name: user.name,
      },
      {
        scopes,
        loginType: validLoginType,
      }
    );

    // Redirect to the original destination or home
    const appUrl = getAppUrl();
    const redirectUrl = new URL(withBasePath(returnTo), appUrl);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[OAuth Callback] Error:", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    const appUrl = getAppUrl();
    return NextResponse.redirect(
      new URL(withBasePath(`/?error=${encodeURIComponent(message)}`), appUrl)
    );
  }
}
