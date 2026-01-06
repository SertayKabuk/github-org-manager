import { NextResponse } from "next/server";

import { getOrgName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type { ApiResponse, GitHubOrganization } from "@/lib/types/github";

export async function GET() {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const orgLogin = getOrgName();
    const octokit = await getAuthenticatedOctokit();

    const [{ data: org }, membersResponse] = await Promise.all([
      octokit.rest.orgs.get({ org: orgLogin }),
      octokit.rest.orgs.listMembers({ org: orgLogin, per_page: 1 }),
    ]);

    const memberCountHeader = membersResponse.headers["x-total-count"];
    const member_count =
      typeof memberCountHeader === "string"
        ? Number.parseInt(memberCountHeader, 10)
        : membersResponse.data.length;

    const orgData: GitHubOrganization & { member_count: number } = {
      login: org.login,
      name: org.name ?? null,
      description: org.description ?? null,
      avatar_url: org.avatar_url,
      blog: org.blog ?? null,
      html_url: org.html_url,
      public_repos: org.public_repos,
      public_gists: org.public_gists,
      member_count,
    };

    const payload: ApiResponse<typeof orgData> = {
      data: orgData,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error fetching organization details.";

    return NextResponse.json<ApiResponse<GitHubOrganization>>(
      { data: {} as GitHubOrganization, error: message },
      { status: 500 }
    );
  }
}
