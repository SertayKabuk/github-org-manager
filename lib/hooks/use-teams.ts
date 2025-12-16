import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, GitHubTeam } from "@/lib/types/github";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<GitHubTeam[]> => {
      const res = await fetch("/api/teams");
      const json: ApiResponse<GitHubTeam[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
