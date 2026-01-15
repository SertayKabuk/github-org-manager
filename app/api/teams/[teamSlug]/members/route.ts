import { NextRequest, NextResponse } from "next/server";

import { getOrgName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type { ApiResponse, GitHubMember } from "@/lib/types/github";

type RouteParams = Promise<{ teamSlug?: string }>;

interface RouteContext {
  params?: RouteParams;
}

async function resolveTeamSlug(request: NextRequest, context: RouteContext): Promise<string | null> {
  const rawParams = context?.params;

  if (rawParams) {
    try {
      const params = await rawParams;
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

const TEAM_MEMBER_ROLES = new Set(["member", "maintainer"] as const);

type TeamRole = "member" | "maintainer";

interface OctokitTeamMemberPayload {
  id: number;
  login: string;
  avatar_url: string;
  name?: string | null;
  role?: TeamRole | null;
  type: string;
}

function mapMember(member: OctokitTeamMemberPayload): GitHubMember {
  const role = member.role ?? undefined;

  return {
    id: member.id,
    login: member.login,
    avatar_url: member.avatar_url,
    name: member.name ?? null,
    role,
    type: member.type,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const teamSlug = await resolveTeamSlug(request, context);

  if (!teamSlug) {
    return NextResponse.json<ApiResponse<GitHubMember[]>>(
      { data: [], error: "Missing team slug." },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();
    const members = await octokit.paginate(octokit.rest.teams.listMembersInOrg, {
      org,
      team_slug: teamSlug,
      per_page: 100,
    });

    const data = members.map(mapMember);

    return NextResponse.json<ApiResponse<GitHubMember[]>>({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error fetching team members.";

    return NextResponse.json<ApiResponse<GitHubMember[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const teamSlug = await resolveTeamSlug(request, context);

  if (!teamSlug) {
    return NextResponse.json<ApiResponse<GitHubMember>>(
      { data: {} as GitHubMember, error: "Missing team slug." },
      { status: 400 }
    );
  }

  let body: { username?: string; usernames?: string[]; role?: TeamRole };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<GitHubMember>>(
      { data: {} as GitHubMember, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const role = body.role ?? "member";
  if (!TEAM_MEMBER_ROLES.has(role)) {
    return NextResponse.json<ApiResponse<GitHubMember>>(
      { data: {} as GitHubMember, error: "Invalid role." },
      { status: 400 }
    );
  }

  const usernames = body.usernames ?? (body.username ? [body.username] : []);

  if (usernames.length === 0) {
    return NextResponse.json<ApiResponse<GitHubMember>>(
      { data: {} as GitHubMember, error: "At least one username is required." },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();

    // Add all users to the team
    await Promise.all(
      usernames.map((username) =>
        octokit.rest.teams.addOrUpdateMembershipForUserInOrg({
          org,
          team_slug: teamSlug,
          username: username.trim(),
          role,
        })
      )
    );

    // If it was a single user, fetch and return the member data for backward compatibility
    if (usernames.length === 1) {
      const username = usernames[0].trim();
      const [{ data: user }, membership] = await Promise.all([
        octokit.rest.users.getByUsername({ username }),
        octokit.rest.teams.getMembershipForUserInOrg({
          org,
          team_slug: teamSlug,
          username,
        }),
      ]);

      const data: GitHubMember = {
        id: user.id,
        login: user.login,
        avatar_url: user.avatar_url,
        name: user.name ?? null,
        role: membership.data.role as TeamRole,
        type: user.type,
      };

      return NextResponse.json<ApiResponse<GitHubMember>>({ data }, { status: 200 });
    }

    interface BulkAddResponse {
      message: string;
    }

    // For bulk add, return a success message in a compatible way
    return NextResponse.json<ApiResponse<BulkAddResponse>>({
      data: { message: `Successfully added ${usernames.length} members to the team.` },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error adding team member.";

    return NextResponse.json<ApiResponse<GitHubMember>>(
      { data: {} as GitHubMember, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const teamSlug = await resolveTeamSlug(request, context);

  if (!teamSlug) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Missing team slug." },
      { status: 400 }
    );
  }

  let username = request.nextUrl.searchParams.get("username")?.trim();

  if (!username) {
    try {
      const body = await request.json();
      username = body?.username?.trim();
    } catch {
      // ignore body parsing errors since username might be in query string
    }
  }

  if (!username) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Username is required." },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();

    await octokit.rest.teams.removeMembershipForUserInOrg({
      org,
      team_slug: teamSlug,
      username,
    });

    return NextResponse.json<ApiResponse<null>>({ data: null }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error removing team member.";

    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
