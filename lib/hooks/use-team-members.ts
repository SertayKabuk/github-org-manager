import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, GitHubMember } from "@/lib/types/github";

export function useTeamMembers(teamSlug: string | undefined) {
  return useQuery({
    queryKey: ["teams", teamSlug, "members"],
    queryFn: async (): Promise<GitHubMember[]> => {
      const res = await fetch(`/api/teams/${teamSlug}/members`);
      const json: ApiResponse<GitHubMember[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
    enabled: !!teamSlug,
  });
}
