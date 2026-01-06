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

  let body: { username?: string; role?: TeamRole };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<GitHubMember>>(
      { data: {} as GitHubMember, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const username = body.username?.trim();
  const role = body.role ?? "member";

  if (!username) {
    return NextResponse.json<ApiResponse<GitHubMember>>(
      { data: {} as GitHubMember, error: "Username is required." },
      { status: 400 }
    );
  }

  if (!TEAM_MEMBER_ROLES.has(role)) {
    return NextResponse.json<ApiResponse<GitHubMember>>(
      { data: {} as GitHubMember, error: "Invalid role." },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();

    await octokit.rest.teams.addOrUpdateMembershipForUserInOrg({
      org,
      team_slug: teamSlug,
      username,
      role,
    });

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
