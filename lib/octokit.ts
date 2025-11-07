/**
 * Lightweight Octokit singleton used across the app.
 * Throws early if the required environment variables are missing so we fail fast.
 */
import { Octokit } from "octokit";

let _octokit: Octokit | null = null;

/** Shared Octokit client authenticated via personal access token. */
export const octokit = new Proxy({} as Octokit, {
  get(_target, prop) {
    if (!_octokit) {
      const token = process.env.GITHUB_TOKEN;
      
      if (!token) {
        throw new Error(
          "Missing GITHUB_TOKEN environment variable. Provide a classic PAT with admin:org scope in your .env.local file."
        );
      }
      
      _octokit = new Octokit({
        auth: token,
        userAgent: "github-org-manager/1.0.0",
      });
    }
    
    return _octokit[prop as keyof Octokit];
  },
});

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
