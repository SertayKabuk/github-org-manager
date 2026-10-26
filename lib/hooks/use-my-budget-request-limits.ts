import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/lib/types/github";
import type { BudgetRequestLimits } from "@/lib/budget-requests";
import { withBasePath } from "@/lib/utils";

export function useMyBudgetRequestLimits() {
  return useQuery({
    queryKey: ["user", "budget-request-limits"],
    queryFn: async (): Promise<BudgetRequestLimits> => {
      const res = await fetch(withBasePath("/api/me/budget-request-limits"));
      const json: ApiResponse<BudgetRequestLimits> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
