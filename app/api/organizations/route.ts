import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse } from "@/lib/types/github";

interface Organization {
  id: number;
  login: string;
  name: string | null;
  description: string | null;
  avatar_url: string;
}

export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const searchQuery = request.nextUrl.searchParams.get("q");

  try {
    const octokit = await getAuthenticatedOctokit();

    const orgs = await octokit.paginate(
      octokit.rest.orgs.listForAuthenticatedUser,
      {
        per_page: 100,
      }
    );

    let data: Organization[] = orgs.map((org) => ({
      id: org.id,
      login: org.login,
      name: (org as { name?: string | null }).name ?? null,
      description: org.description ?? null,
      avatar_url: org.avatar_url,
    }));

    // Filter by search query if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(
        (org) =>
          org.login.toLowerCase().includes(query) ||
          org.name?.toLowerCase().includes(query) ||
          org.description?.toLowerCase().includes(query)
      );
    }

    const payload: ApiResponse<Organization[]> = {
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
      error instanceof Error ? error.message : "Unexpected error fetching organizations.";

    return NextResponse.json<ApiResponse<Organization[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}
