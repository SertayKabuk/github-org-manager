/**
 * Lightweight Octokit singleton used across the app.
 * Supports both OAuth tokens (from session) and static tokens (from env).
 */
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";
import { getToken } from "./auth/session";

const USER_AGENT = "github-org-manager/1.0.0";
const GITHUB_API_VERSION = "2022-11-28";

function parseInstallationId(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getGitHubAppPrivateKey(): string | null {
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!privateKey?.trim()) {
    return null;
  }

  return privateKey.includes("\\n") ? privateKey.replace(/\\n/g, "\n") : privateKey;
}

/**
 * Creates an Octokit instance with OAuth token from session.
 * Use this in API routes and server components where session is available.
 */
export async function getAuthenticatedOctokit(): Promise<Octokit> {
  const token = await getToken();
  
  return new Octokit({
    auth: token,
    userAgent: USER_AGENT,
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
    userAgent: USER_AGENT,
  });
}

/**
 * Creates an Octokit instance for background automation.
 * Prefers the existing system token and falls back to GitHub App auth.
 */
export async function getAutomationOctokit(
  installationId?: number
): Promise<Octokit> {
  if (process.env.GITHUB_SYSTEM_TOKEN?.trim()) {
    return getSystemOctokit();
  }

  const appId = process.env.GITHUB_APP_ID;
  const privateKey = getGitHubAppPrivateKey();
  const resolvedInstallationId =
    installationId ?? parseInstallationId(process.env.GITHUB_APP_INSTALLATION_ID);

  if (!appId || !privateKey || !resolvedInstallationId) {
    throw new Error(
      "Missing automation credentials. Configure GITHUB_SYSTEM_TOKEN or GitHub App settings (GITHUB_APP_ID, GITHUB_PRIVATE_KEY, and GITHUB_APP_INSTALLATION_ID or an installation webhook payload)."
    );
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId: resolvedInstallationId,
    },
    userAgent: USER_AGENT,
    request: {
      headers: {
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    },
  });
}

/**
 * Returns the default cost center ID for new members or null if not configured.
 */
export function getDefaultCostCenterId(): string | null {
  return process.env.DEFAULT_COST_CENTER_ID || null;
}
