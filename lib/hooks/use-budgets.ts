import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, Budget } from "@/lib/types/github";
import { withBasePath } from "@/lib/utils";

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async (): Promise<Budget[]> => {
      const res = await fetch(withBasePath("/api/budgets"));
      const json: ApiResponse<Budget[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
