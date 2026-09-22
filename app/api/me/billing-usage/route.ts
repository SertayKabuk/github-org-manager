import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/helpers";
import { getSession } from "@/lib/auth/session";
import { getAuthenticatedOctokit, getEnterpriseName, getSystemOctokit } from "@/lib/octokit";
import type { ApiResponse, BillingUsageSummary } from "@/lib/types/github";
import * as CostCenterRepository from "@/lib/repositories/cost-center-repository";

function hasAdminAccess(scopes?: string[], loginType?: string) {
  return loginType === "admin" || Boolean(scopes?.includes("admin:org"));
}

interface RawUsagePayload {
  timePeriod?: BillingUsageSummary["timePeriod"];
  enterprise?: string;
  usageItems?: BillingUsageSummary["usageItems"];
}

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  const login = session.user?.login;

  if (!login) {
    return NextResponse.json(
      { error: "User login not found in session" },
      { status: 400 }
    );
  }

  try {
    const userCostCenter = await CostCenterRepository.findByLogin(login);

    const enterprise = getEnterpriseName();
    const octokit = process.env.GITHUB_SYSTEM_TOKEN?.trim()
      ? getSystemOctokit()
      : hasAdminAccess(session.scopes, session.loginType)
        ? await getAuthenticatedOctokit()
        : null;

    if (!octokit) {
      return NextResponse.json<ApiResponse<BillingUsageSummary | null>>(
        {
          data: null,
          error: "Billing usage is unavailable for user sessions because GITHUB_SYSTEM_TOKEN is not configured.",
        },
        { status: 503 }
      );
    }

    // Cost-center usage covers cost_center-scoped budgets; AI-credit usage (keyed by login)
    // covers user-scoped budgets, which aren't tied to a cost center at all.
    const [costCenterUsage, userAiCreditUsage] = await Promise.all([
      userCostCenter
        ? octokit
            .request("GET /enterprises/{enterprise}/settings/billing/usage/summary", {
              enterprise,
              cost_center_id: userCostCenter.id,
              headers: { "X-GitHub-Api-Version": "2022-11-28" },
            })
            .then((res) => res.data as RawUsagePayload)
        : null,
      octokit
        .request("GET /enterprises/{enterprise}/settings/billing/ai_credit/usage", {
          enterprise,
          user: login,
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        })
        .then((res) => res.data as RawUsagePayload)
        .catch((err) => {
          console.warn(`[me/billing-usage] Failed to fetch AI credit usage for ${login}:`, err);
          return null;
        }),
    ]);

    if (!costCenterUsage && !userAiCreditUsage) {
      return NextResponse.json<ApiResponse<BillingUsageSummary | null>>(
        { data: null },
        { status: 200 }
      );
    }

    const summary: BillingUsageSummary = {
      timePeriod: costCenterUsage?.timePeriod ??
        userAiCreditUsage?.timePeriod ?? {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        },
      enterprise: costCenterUsage?.enterprise ?? userAiCreditUsage?.enterprise ?? enterprise,
      costCenter: userCostCenter ? { id: userCostCenter.id, name: userCostCenter.name } : undefined,
      usageItems: [
        ...(costCenterUsage?.usageItems ?? []),
        ...(userAiCreditUsage?.usageItems ?? []),
      ],
    };

    return NextResponse.json<ApiResponse<BillingUsageSummary | null>>(
      { data: summary },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error fetching billing usage.";

    return NextResponse.json<ApiResponse<BillingUsageSummary | null>>(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
