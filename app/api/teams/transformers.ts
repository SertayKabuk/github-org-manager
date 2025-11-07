import type { GitHubTeam } from "@/lib/types/github";

/** Normalizes the GitHub team payload into our internal shape. */
export function mapTeam(team: any): GitHubTeam {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description ?? null,
    privacy: (team.privacy ?? "closed") as GitHubTeam["privacy"],
    members_count: (team.members_count ?? 0) as number,
    repos_count: (team.repos_count ?? 0) as number,
    html_url: team.html_url,
    avatar_url: team.avatar_url ?? null,
  };
}
