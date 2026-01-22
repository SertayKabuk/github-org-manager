import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, CostCenter } from "@/lib/types/github";
import { withBasePath } from "@/lib/utils";

export function useUserCostCenter() {
  return useQuery({
    queryKey: ["user", "cost-center"],
    queryFn: async (): Promise<CostCenter | null> => {
      const res = await fetch(withBasePath("/api/me/cost-center"));
      const json: ApiResponse<CostCenter | null> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
