import { NextRequest, NextResponse } from "next/server";

import { getOrgName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type { ApiResponse } from "@/lib/types/github";

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
  html_url: string;
  description: string | null;
}

export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const searchQuery = request.nextUrl.searchParams.get("q");

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();

    const repos = await octokit.paginate(
      octokit.rest.repos.listForOrg,
      {
        org,
        per_page: 100,
        type: "all",
      }
    );

    let data: GitHubRepository[] = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      owner: {
        login: repo.owner.login,
      },
      html_url: repo.html_url,
      description: repo.description ?? null,
    }));

    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(
        (repo) =>
          repo.name.toLowerCase().includes(query) ||
          repo.full_name.toLowerCase().includes(query) ||
          repo.description?.toLowerCase().includes(query)
      );
    }

    const payload: ApiResponse<GitHubRepository[]> = {
      data,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "x-total-count": data.length.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error fetching repositories.";

    return NextResponse.json<ApiResponse<GitHubRepository[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}
