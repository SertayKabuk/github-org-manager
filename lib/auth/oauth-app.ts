/**
 * GitHub OAuth App configuration.
 * Singleton instance used for OAuth authentication flow.
 */
import { OAuthApp } from "@octokit/oauth-app";
import { getAppUrl } from "./helpers";

let _oauthApp: OAuthApp | null = null;

/**
 * Returns the configured OAuth app instance.
 * Throws if required environment variables are missing.
 */
export function getOAuthApp(): OAuthApp {
  if (_oauthApp) {
    return _oauthApp;
  }
  
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GitHub OAuth credentials. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.local"
    );
  }
  
  _oauthApp = new OAuthApp({
    clientType: "oauth-app",
    clientId,
    clientSecret,
  });
  
  return _oauthApp;
}

/**
 * Gets the OAuth callback URL (runtime-configurable via APP_URL).
 */
export function getCallbackUrl(): string {
  const baseUrl = getAppUrl();
  return `${baseUrl}/api/auth/github/callback`;
}
