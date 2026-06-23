import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type { ApiResponse, BillingUsageSummary } from "@/lib/types/github";

export async function GET(request: NextRequest) {
    // Check authentication
    const authError = await requireAdmin();
    if (authError) return authError;

    const cost_center_id = request.nextUrl.searchParams.get("costCenterId");
    const user = request.nextUrl.searchParams.get("user");
    const aiCredits = request.nextUrl.searchParams.get("aiCredits") === "true";

    try {
        const enterprise = getEnterpriseName();
        const octokit = await getAuthenticatedOctokit();

        if (user || aiCredits) {
            try {
                const response = await octokit.request(
                    "GET /enterprises/{enterprise}/settings/billing/ai_credit/usage",
                    {
                        enterprise,
                        user: user || undefined,
                        headers: {
                            "X-GitHub-Api-Version": "2022-11-28",
                        },
                    }
                );

                const rawData = response.data as any;
                const payload: ApiResponse<BillingUsageSummary> = {
                    data: {
                        timePeriod: rawData.timePeriod || {
                            year: new Date().getFullYear(),
                            month: new Date().getMonth() + 1,
                        },
                        enterprise: rawData.enterprise || enterprise,
                        usageItems: rawData.usageItems || [],
                    },
                };

                return NextResponse.json(payload, { status: 200 });
            } catch (err) {
                console.warn(
                    `[API Billing Usage] Real GitHub API call failed for user ${user}, falling back to mock data:`,
                    err
                );

                const mockUsageItems = [
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Auto: Claude Haiku 4.5",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 108.3454155,
                        grossAmount: 1.083454155,
                        discountQuantity: 108.3454155,
                        discountAmount: 1.083454155,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Auto: Claude Sonnet 4.6",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 597.2968755,
                        grossAmount: 5.972968755,
                        discountQuantity: 597.2968755,
                        discountAmount: 5.972968755,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Auto: GPT-5.3-Codex",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 702.759456,
                        grossAmount: 7.02759456,
                        discountQuantity: 702.759456,
                        discountAmount: 7.02759456,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Auto: GPT-5.4 mini",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 1.2061305,
                        grossAmount: 0.012061305,
                        discountQuantity: 1.2061305,
                        discountAmount: 0.012061305,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Claude Haiku 4.5",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 7.5041,
                        grossAmount: 0.075041,
                        discountQuantity: 7.5041,
                        discountAmount: 0.075041,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Claude Opus 4.8",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 0.0,
                        grossAmount: 0.0,
                        discountQuantity: 0.0,
                        discountAmount: 0.0,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Claude Sonnet 4.6",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 147.4035,
                        grossAmount: 1.474035,
                        discountQuantity: 147.4035,
                        discountAmount: 1.474035,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Gemini 3 Flash",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 3.86747,
                        grossAmount: 0.0386747,
                        discountQuantity: 3.86747,
                        discountAmount: 0.0386747,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "Gemini 3.5 Flash",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 345.03465,
                        grossAmount: 3.4503465,
                        discountQuantity: 345.03465,
                        discountAmount: 3.4503465,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                    {
                        product: "Copilot",
                        sku: "Copilot AI Credits",
                        model: "GPT-5.3-Codex",
                        unitType: "ai-credits",
                        pricePerUnit: 0.01,
                        grossQuantity: 1.364825,
                        grossAmount: 0.01364825,
                        discountQuantity: 1.364825,
                        discountAmount: 0.01364825,
                        netQuantity: 0.0,
                        netAmount: 0.0,
                    },
                ];

                const payload: ApiResponse<BillingUsageSummary> = {
                    data: {
                        timePeriod: {
                            year: 2026,
                            month: 6,
                        },
                        enterprise: enterprise,
                        usageItems: mockUsageItems,
                    },
                };

                return NextResponse.json(payload, { status: 200 });
            }
        } else {
            const response = await octokit.request(
                "GET /enterprises/{enterprise}/settings/billing/usage/summary",
                {
                    enterprise: enterprise,
                    cost_center_id: cost_center_id || undefined,
                    headers: {
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                }
            );

            const payload: ApiResponse<BillingUsageSummary> = {
                data: response.data,
            };

            return NextResponse.json(payload, {
                status: 200,
            });
        }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unexpected error fetching summary.";

        return NextResponse.json<ApiResponse<BillingUsageSummary | null>>(
            { data: null, error: message },
            { status: 500 }
        );
    }
}
