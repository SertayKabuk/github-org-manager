export type TeamPrivacy = "closed" | "secret";

export interface GitHubTeam {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  privacy: TeamPrivacy;
  members_count: number;
  repos_count: number;
  html_url: string;
  avatar_url?: string | null;
}

export interface GitHubMember {
  id: number;
  login: string;
  avatar_url: string;
  name?: string | null;
  role?: "admin" | "member" | "maintainer";
  type: string;
  teams?: { id: number; name: string; slug: string }[];
}

export interface GitHubOrganization {
  login: string;
  name: string | null;
  description: string | null;
  avatar_url: string;
  blog?: string | null;
  html_url: string;
  public_repos: number;
  public_gists: number;
  members?: number;
}

export interface TeamMembership {
  role: "member" | "maintainer";
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  privacy?: TeamPrivacy;
  parent_team_id?: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
