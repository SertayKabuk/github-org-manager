/**
 * Lightweight Octokit singleton used across the app.
 * Supports both OAuth tokens (from session) and static tokens (from env).
 */
import { Octokit } from "octokit";
import { getToken } from "./auth/session";

/**
 * Creates an Octokit instance with OAuth token from session.
 * Use this in API routes and server components where session is available.
 */
export async function getAuthenticatedOctokit(): Promise<Octokit> {
  const token = await getToken();
  
  return new Octokit({
    auth: token,
    userAgent: "github-org-manager/1.0.0",
  });
}

/** Returns the configured organization login or throws if missing. */
export function getOrgName(): string {
  const org = process.env.GITHUB_ORG;

  if (!org) {
    throw new Error(
      "Missing GITHUB_ORG environment variable. Define the organization login in your .env.local file."
    );
  }

  return org;
}
