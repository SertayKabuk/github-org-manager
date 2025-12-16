import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, BillingUsageSummary } from "@/lib/types/github";

export interface UseBillingUsageOptions {
  costCenterId?: string | null;
}

export function useBillingUsage(options: UseBillingUsageOptions = {}) {
  const { costCenterId } = options;

  return useQuery({
    queryKey: ["billing-usage", { costCenterId }],
    queryFn: async (): Promise<BillingUsageSummary | null> => {
      const params = new URLSearchParams();
      if (costCenterId) params.set("costCenterId", costCenterId);

      const url = `/api/billing-usage${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      const json: ApiResponse<BillingUsageSummary | null> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
