import type { GitHubTeam } from "@/lib/types/github";

type OctokitTeamPayload = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  privacy?: GitHubTeam["privacy"] | null;
  members_count?: number | null;
  repos_count?: number | null;
  html_url: string;
  avatar_url?: string | null;
};

/** Normalizes the GitHub team payload into our internal shape. */
export function mapTeam(team: OctokitTeamPayload): GitHubTeam {
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
