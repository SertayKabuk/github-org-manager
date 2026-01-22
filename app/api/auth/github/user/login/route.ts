/**
 * GitHub OAuth user login endpoint.
 * Redirects users to GitHub's authorization page with user:email scope only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getOAuthApp, getCallbackUrl } from "@/lib/auth/oauth-app";

export async function GET(request: NextRequest) {
    try {
        const oauthApp = getOAuthApp();
        const callbackUrl = getCallbackUrl();

        // Get the redirect URL (where to send user after they return from GitHub)
        const returnTo = request.nextUrl.searchParams.get("returnTo") || "/";

        // Generate the GitHub authorization URL with user:email and read:org scope
        const { url } = oauthApp.getWebFlowAuthorizationUrl({
            redirectUrl: callbackUrl,
            scopes: ["user:email", "read:org"],
            state: `user:${returnTo}`, // Prefix with login type
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
