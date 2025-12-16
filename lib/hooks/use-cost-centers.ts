import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, CostCenter, CostCenterState } from "@/lib/types/github";

export interface UseCostCentersOptions {
  state?: CostCenterState;
}

export function useCostCenters(options: UseCostCentersOptions = {}) {
  const { state } = options;

  return useQuery({
    queryKey: ["cost-centers", { state }],
    queryFn: async (): Promise<CostCenter[]> => {
      const params = new URLSearchParams();
      if (state) params.set("state", state);

      const url = `/api/cost-centers${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      const json: ApiResponse<CostCenter[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
