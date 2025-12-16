import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse, BillingUsageSummary } from "@/lib/types/github";

export async function GET(request: NextRequest) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    const cost_center_id = request.nextUrl.searchParams.get("costCenterId");

    try {
        const enterprise = getEnterpriseName();
        const octokit = await getAuthenticatedOctokit();

        const response = await octokit.request('GET /enterprises/{enterprise}/settings/billing/usage/summary', {
            enterprise: enterprise,
            cost_center_id: cost_center_id,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        let data: BillingUsageSummary = response.data;

        const payload: ApiResponse<BillingUsageSummary> = {
            data,
        };

        return NextResponse.json(payload, {
            status: 200,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unexpected error fetching summary.";

        return NextResponse.json<ApiResponse<BillingUsageSummary | null>>(
            { data: null, error: message },
            { status: 500 }
        );
    }
}
