import { NextRequest, NextResponse } from "next/server";

import { getOrgName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type { ApiResponse, GitHubMember } from "@/lib/types/github";

const ROLE_FILTERS = new Set(["all", "admin", "member"] as const);

type RoleFilter = "all" | "admin" | "member";

export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const roleParam = (request.nextUrl.searchParams.get("role") || "all") as RoleFilter;
  const teamSlug = request.nextUrl.searchParams.get("team");

  if (!ROLE_FILTERS.has(roleParam)) {
    return NextResponse.json<ApiResponse<GitHubMember[]>>(
      { data: [], error: "Invalid role filter" },
      { status: 400 }
    );
  }

  try {
    const org = getOrgName();
    const octokit = await getAuthenticatedOctokit();
    let data: GitHubMember[] = [];

    // Fetch all teams once and build a map of team slug to team members
    const buildTeamMembershipMap = async () => {
      try {
        const allTeams = await octokit.paginate(octokit.rest.teams.list, { org, per_page: 100 });
        
        // Fetch members for each team in parallel
        const teamMemberships = await Promise.all(
          allTeams.map(async (team) => {
            try {
              const members = await octokit.paginate(
                octokit.rest.teams.listMembersInOrg,
                { org, team_slug: team.slug, per_page: 100 }
              );
              return {
                team: { id: team.id, name: team.name, slug: team.slug },
                memberLogins: new Set(members.map(m => m.login)),
              };
            } catch (error) {
              console.warn(`Could not fetch members for team ${team.slug}`, error);
              return {
                team: { id: team.id, name: team.name, slug: team.slug },
                memberLogins: new Set<string>(),
              };
            }
          })
        );

        // Build reverse map: username -> teams
        const memberToTeams = new Map<string, { id: number; name: string; slug: string }[]>();
        
        for (const { team, memberLogins } of teamMemberships) {
          for (const login of memberLogins) {
            if (!memberToTeams.has(login)) {
              memberToTeams.set(login, []);
            }
            memberToTeams.get(login)!.push(team);
          }
        }
        
        return memberToTeams;
      } catch (error) {
        console.warn('Could not build team membership map', error);
        return new Map<string, { id: number; name: string; slug: string }[]>();
      }
    };

    // Build the membership map once
    const memberToTeamsMap = await buildTeamMembershipMap();

    // If team filter is specified, fetch team members
    if (teamSlug && teamSlug !== "all") {
      const teamMembers = await octokit.paginate(
        octokit.rest.teams.listMembersInOrg,
        {
          org,
          team_slug: teamSlug,
          per_page: 100,
        }
      );

      // If role filter is specified and not "all", we need to get org membership for each user
      if (roleParam !== "all") {
        const membersWithRoles = await Promise.all(
          teamMembers.map(async (member) => {
            try {
              const { data: membership } = await octokit.rest.orgs.getMembershipForUser({
                org,
                username: member.login,
              });
              return {
                ...member,
                orgRole: membership.role as "admin" | "member",
                teams: memberToTeamsMap.get(member.login) || [],
              };
            } catch (error) {
              console.warn(`Could not fetch org role for ${member.login}`, error);
              return {
                ...member,
                orgRole: "member" as const,
                teams: memberToTeamsMap.get(member.login) || [],
              };
            }
          })
        );

        // Filter by the requested org role
        const filteredMembers = membersWithRoles.filter(
          (member) => member.orgRole === roleParam
        );

        data = filteredMembers.map((member) => ({
          id: member.id,
          login: member.login,
          avatar_url: member.avatar_url,
          name: (member as { name?: string | null }).name ?? null,
          role: member.orgRole,
          type: member.type,
          teams: member.teams,
        }));
      } else {
        // No role filter, just map teams from our prebuilt map
        data = teamMembers.map((member) => ({
          id: member.id,
          login: member.login,
          avatar_url: member.avatar_url,
          name: (member as { name?: string | null }).name ?? null,
          role: undefined,
          type: member.type,
          teams: memberToTeamsMap.get(member.login) || [],
        }));
      }
    } else {
      // Otherwise fetch all org members with role filter
      const members = await octokit.paginate(
        octokit.rest.orgs.listMembers,
        {
          org,
          per_page: 100,
          role: roleParam === "all" ? undefined : roleParam,
        }
      );

      // Map teams from our prebuilt map
      data = members.map((member) => ({
        id: member.id,
        login: member.login,
        avatar_url: member.avatar_url,
        name: (member as { name?: string | null }).name ?? null,
        role: roleParam === "all" ? undefined : roleParam,
        type: member.type,
        teams: memberToTeamsMap.get(member.login) || [],
      }));
    }

    const payload: ApiResponse<GitHubMember[]> = {
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
      error instanceof Error ? error.message : "Unexpected error fetching members.";

    return NextResponse.json<ApiResponse<GitHubMember[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}
