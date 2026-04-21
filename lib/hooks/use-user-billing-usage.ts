import { useQuery } from "@tanstack/react-query";
import type { ApiResponse, BillingUsageSummary } from "@/lib/types/github";
import { withBasePath } from "@/lib/utils";

export interface UseUserBillingUsageOptions {
  enabled?: boolean;
}

export function useUserBillingUsage(options: UseUserBillingUsageOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["user", "billing-usage"],
    enabled,
    queryFn: async (): Promise<BillingUsageSummary | null> => {
      const res = await fetch(withBasePath("/api/me/billing-usage"));
      const json: ApiResponse<BillingUsageSummary | null> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
