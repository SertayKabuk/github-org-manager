import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, GitHubMember } from "@/lib/types/github";
import { withBasePath } from "@/lib/utils";

export type MemberRole = "all" | "admin" | "member";

export interface UseMembersOptions {
  role?: MemberRole;
  team?: string;
}

export function useMembers(options: UseMembersOptions = {}) {
  const { role = "all", team } = options;

  return useQuery({
    queryKey: ["members", { role, team }],
    queryFn: async (): Promise<GitHubMember[]> => {
      const params = new URLSearchParams();
      if (role !== "all") params.set("role", role);
      if (team && team !== "all") params.set("team", team);

      const url = withBasePath(`/api/members${params.toString() ? `?${params}` : ""}`);
      const res = await fetch(url);
      const json: ApiResponse<GitHubMember[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
