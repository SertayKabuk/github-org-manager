import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/lib/types/github";
import type { BudgetRequestEntity } from "@/lib/entities/budget-request";
import { withBasePath } from "@/lib/utils";

export function useMyBudgetRequests() {
  return useQuery({
    queryKey: ["user", "budget-requests"],
    queryFn: async (): Promise<BudgetRequestEntity[]> => {
      const res = await fetch(withBasePath("/api/me/budget-requests"));
      const json: ApiResponse<BudgetRequestEntity[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
