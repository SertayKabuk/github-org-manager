import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, GitHubTeam } from "@/lib/types/github";
import { withBasePath } from "@/lib/utils";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async (): Promise<GitHubTeam[]> => {
      const res = await fetch(withBasePath("/api/teams"));
      const json: ApiResponse<GitHubTeam[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
