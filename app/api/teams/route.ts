import { NextRequest, NextResponse } from "next/server";

import { getOrgName, octokit } from "@/lib/octokit";
import type { ApiResponse, CreateTeamInput, GitHubTeam } from "@/lib/types/github";

import { mapTeam } from "./transformers";

const PRIVACY_OPTIONS: ReadonlySet<string> = new Set(["closed", "secret"]);

export async function GET() {
  try {
    const org = getOrgName();

    const teams = await octokit.paginate(octokit.rest.teams.list, {
      org,
      per_page: 100,
    });

    // The list endpoint doesn't include members_count and repos_count,
    // so we need to fetch full details for each team
    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        try {
          const { data: fullTeam } = await octokit.rest.teams.getByName({
            org,
            team_slug: team.slug,
          });
          return fullTeam;
        } catch (error) {
          console.error(`Failed to fetch details for team ${team.slug}:`, error);
          return team;
        }
      })
    );

    const data: GitHubTeam[] = teamsWithDetails.map(mapTeam);

    return NextResponse.json<ApiResponse<GitHubTeam[]>>({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error fetching teams.";

    return NextResponse.json<ApiResponse<GitHubTeam[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: CreateTeamInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!body.name?.trim()) {
    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: "Team name is required." },
      { status: 400 }
    );
  }

  if (body.privacy && !PRIVACY_OPTIONS.has(body.privacy)) {
    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: "Invalid privacy option." },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();

    const response = await octokit.rest.teams.create({
      org,
      name: body.name,
      description: body.description,
      privacy: body.privacy,
      parent_team_id: body.parent_team_id,
    });

    const data: GitHubTeam = mapTeam(response.data);

    return NextResponse.json<ApiResponse<GitHubTeam>>({ data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error creating team.";

    return NextResponse.json<ApiResponse<GitHubTeam>>(
      { data: {} as GitHubTeam, error: message },
      { status: 500 }
    );
  }
}
