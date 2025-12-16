import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, GitHubOrganization } from "@/lib/types/github";

export type OrgWithMemberCount = GitHubOrganization & { member_count: number };

export function useOrg() {
  return useQuery({
    queryKey: ["org"],
    queryFn: async (): Promise<OrgWithMemberCount> => {
      const res = await fetch("/api/orgs");
      const json: ApiResponse<OrgWithMemberCount> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
