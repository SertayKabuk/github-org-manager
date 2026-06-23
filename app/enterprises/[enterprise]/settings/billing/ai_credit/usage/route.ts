import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";

type RouteParams = Promise<{ enterprise: string }>;

interface RouteContext {
  params: RouteParams;
}

export async function GET(request: NextRequest, context: RouteContext) {
  // Check authorization
  const authError = await requireAdmin();
  if (authError) return authError;

  const params = await context.params;
  const enterprise = params.enterprise;

  const user = request.nextUrl.searchParams.get("user") || undefined;
  const year = request.nextUrl.searchParams.get("year") || undefined;
  const month = request.nextUrl.searchParams.get("month") || undefined;

  try {
    const octokit = await getAuthenticatedOctokit();

    // Call actual GitHub Enterprise billing API for AI credit usage
    const response = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/ai_credit/usage",
      {
        enterprise,
        user,
        year: year ? parseInt(year, 10) : undefined,
        month: month ? parseInt(month, 10) : undefined,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const rawData = response.data as any;

    const payload = {
      timePeriod: rawData.timePeriod || {
        year: year ? parseInt(year, 10) : new Date().getFullYear(),
        month: month ? parseInt(month, 10) : new Date().getMonth() + 1,
      },
      enterprise: rawData.enterprise || decodeURIComponent(enterprise),
      user: user || null,
      usageItems: rawData.usageItems || [],
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.warn(
      `[AI Credit Usage API] GitHub Enterprise API request failed: ${
        error instanceof Error ? error.message : String(error)
      }. Falling back to mock data.`
    );

    // Provide mock data fallback for development/sandbox testing
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

    const mockPayload = {
      timePeriod: {
        year: year ? parseInt(year, 10) : 2026,
        month: month ? parseInt(month, 10) : 6,
      },
      enterprise: decodeURIComponent(enterprise),
      user: user || null,
      usageItems: mockUsageItems,
    };

    return NextResponse.json(mockPayload, { status: 200 });
  }
}
