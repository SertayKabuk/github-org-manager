import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/lib/types/github";
import type { BudgetRequestEntity } from "@/lib/entities/budget-request";
import { withBasePath } from "@/lib/utils";

export interface UseBudgetRequestsOptions {
  status?: string;
}

export function useBudgetRequests(options: UseBudgetRequestsOptions = {}) {
  const { status = "all" } = options;

  return useQuery({
    queryKey: ["budget-requests", { status }],
    queryFn: async (): Promise<BudgetRequestEntity[]> => {
      const url = status === "all" ? "/api/budget-requests" : `/api/budget-requests?status=${status}`;
      const res = await fetch(withBasePath(url));
      const json: ApiResponse<BudgetRequestEntity[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
