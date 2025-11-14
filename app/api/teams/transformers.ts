import type { GitHubTeam } from "@/lib/types/github";

const TEAM_PRIVACY_VALUES: ReadonlySet<GitHubTeam["privacy"]> = new Set(["closed", "secret"]);

type OctokitTeamPayload = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  privacy?: GitHubTeam["privacy"] | string | null;
  members_count?: number | null;
  repos_count?: number | null;
  html_url: string;
  avatar_url?: string | null;
};

function normalizePrivacy(privacy?: string | null): GitHubTeam["privacy"] {
  if (privacy && TEAM_PRIVACY_VALUES.has(privacy as GitHubTeam["privacy"])) {
    return privacy as GitHubTeam["privacy"];
  }

  return "closed";
}

/** Normalizes the GitHub team payload into our internal shape. */
export function mapTeam(team: OctokitTeamPayload): GitHubTeam {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description ?? null,
    privacy: normalizePrivacy(team.privacy ?? null),
    members_count: (team.members_count ?? 0) as number,
    repos_count: (team.repos_count ?? 0) as number,
    html_url: team.html_url,
    avatar_url: team.avatar_url ?? null,
  };
}
