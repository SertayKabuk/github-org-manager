import { NextRequest, NextResponse } from "next/server";

import { getOrgName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse, GitHubTeam } from "@/lib/types/github";

import { mapTeam } from "../transformers";

interface RouteContext {
  params?: Promise<{ teamSlug?: string }> | { teamSlug?: string };
}

async function resolveTeamSlug(request: NextRequest, context: RouteContext): Promise<string | null> {
  const rawParams = context?.params;

  if (rawParams) {
    try {
      const params = await Promise.resolve(rawParams);
      if (params?.teamSlug) {
        return params.teamSlug;
      }
    } catch (error) {
      console.warn("Failed to resolve route params", error);
    }
  }

  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const teamsIndex = segments.lastIndexOf("teams");
  if (teamsIndex !== -1 && segments.length > teamsIndex + 1) {
    return segments[teamsIndex + 1];
  }

  return null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const teamSlug = await resolveTeamSlug(request, context);

  if (!teamSlug) {
    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: "Missing team slug." },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();
    const response = await octokit.rest.teams.getByName({
      org,
      team_slug: teamSlug,
    });

    const data = mapTeam(response.data);

    return NextResponse.json<ApiResponse<GitHubTeam>>({ data }, { status: 200 });
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && (error as any).status === 404) {
      return NextResponse.json<ApiResponse<GitHubTeam>>(
        { data: {} as GitHubTeam, error: "Team not found." },
        { status: 404 }
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected error fetching team.";

    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const teamSlug = await resolveTeamSlug(request, context);

  if (!teamSlug) {
    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: "Missing team slug." },
      { status: 400 }
    );
  }

  let body: Partial<Pick<GitHubTeam, "name" | "description" | "privacy">>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: "No fields provided for update." },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();

    const response = await octokit.rest.teams.updateInOrg({
      org,
      team_slug: teamSlug,
      name: body.name,
      description: body.description ?? undefined,
      privacy: body.privacy,
    });

    const data = mapTeam(response.data);

    return NextResponse.json<ApiResponse<GitHubTeam>>({ data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error updating team.";

    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const teamSlug = await resolveTeamSlug(request, context);

  if (!teamSlug) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Missing team slug." },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();
    await octokit.rest.teams.deleteInOrg({
      org,
      team_slug: teamSlug,
    });

    return NextResponse.json<ApiResponse<null>>({ data: null }, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error deleting team.";

    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
