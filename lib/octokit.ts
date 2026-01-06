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

/** Returns the configured enterprise slug or throws if missing. */
export function getEnterpriseName(): string {
  const enterprise = process.env.GITHUB_ENTERPRISE;

  if (!enterprise) {
    throw new Error(
      "Missing GITHUB_ENTERPRISE environment variable. Define the enterprise slug in your .env.local file."
    );
  }

  return enterprise;
}

/**
 * Creates an Octokit instance with system token from environment.
 * Use this for background operations (webhooks, cron jobs) where no user session exists.
 * Requires GITHUB_SYSTEM_TOKEN environment variable (PAT with admin:enterprise scope).
 */
export function getSystemOctokit(): Octokit {
  const token = process.env.GITHUB_SYSTEM_TOKEN;

  if (!token) {
    throw new Error(
      "Missing GITHUB_SYSTEM_TOKEN environment variable. Required for webhook processing."
    );
  }

  return new Octokit({
    auth: token,
    userAgent: "github-org-manager/1.0.0",
  });
}

/**
 * Returns the default cost center ID for new members or null if not configured.
 */
export function getDefaultCostCenterId(): string | null {
  return process.env.DEFAULT_COST_CENTER_ID || null;
}
