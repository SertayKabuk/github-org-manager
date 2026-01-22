import { NextResponse } from "next/server";
import { getAuthenticatedOctokit, getOrgName } from "@/lib/octokit";
import { requireAuth } from "@/lib/auth/helpers";
import { ApiResponse, GitHubTeam } from "@/lib/types/github";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const octokit = await getAuthenticatedOctokit();
    const org = getOrgName();
    
    // List teams for the authenticated user within the organization
    // Note: listForAuthenticatedUser returns ALL teams across ALL orgs.
    // We should filter or use another endpoint if we only want org teams.
    // However, github-org-manager is usually focused on a specific org.
    // Octokit doesn't have a direct "list teams for user in ORG" beyond iterating.
    // We'll use listForAuthenticatedUser and we can filter if needed, 
    // but usually, seeing all your teams in this dashboard is fine.
    
    const data = await octokit.paginate(octokit.rest.teams.listForAuthenticatedUser, {
      per_page: 100,
    });

    // Filter by org if needed - here we just return them all or filter by the main org
    const orgTeams = data.filter(team => team.organization.login.toLowerCase() === org.toLowerCase());

    return NextResponse.json<ApiResponse<GitHubTeam[]>>({ data: orgTeams as unknown as GitHubTeam[] });
  } catch (error) {
    console.error("Error fetching user teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
