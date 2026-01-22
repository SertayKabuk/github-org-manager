import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/lib/types/github";
import type { EmailMappingEntity } from "@/lib/entities/email-mapping";
import { withBasePath } from "@/lib/utils";

export function useUserEmailMappings() {
  return useQuery({
    queryKey: ["user", "email-mappings"],
    queryFn: async (): Promise<EmailMappingEntity[]> => {
      const res = await fetch(withBasePath("/api/me/email-mappings"));
      const json: ApiResponse<EmailMappingEntity[]> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
  });
}
