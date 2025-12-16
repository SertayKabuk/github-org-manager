import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, GitHubTeam } from "@/lib/types/github";

export function useTeam(teamSlug: string | undefined) {
  return useQuery({
    queryKey: ["teams", teamSlug],
    queryFn: async (): Promise<GitHubTeam> => {
      const res = await fetch(`/api/teams/${teamSlug}`);
      const json: ApiResponse<GitHubTeam> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
    enabled: !!teamSlug,
  });
}
