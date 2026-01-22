import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, GitHubOrganization } from "@/lib/types/github";
import { withBasePath } from "@/lib/utils";

export type OrgWithMemberCount = GitHubOrganization & { member_count: number };

export function useOrg() {
  return useQuery({
    queryKey: ["org"],
    queryFn: async (): Promise<OrgWithMemberCount> => {
      const res = await fetch(withBasePath("/api/orgs"));
      const json: ApiResponse<OrgWithMemberCount> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
