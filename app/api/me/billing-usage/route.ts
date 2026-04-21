import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/helpers";
import { getSession } from "@/lib/auth/session";
import { getAuthenticatedOctokit, getEnterpriseName, getSystemOctokit } from "@/lib/octokit";
import type { ApiResponse, BillingUsageSummary } from "@/lib/types/github";
import * as CostCenterRepository from "@/lib/repositories/cost-center-repository";

function hasAdminAccess(scopes?: string[], loginType?: string) {
  return loginType === "admin" || Boolean(scopes?.includes("admin:org"));
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

    if (!userCostCenter) {
      return NextResponse.json<ApiResponse<BillingUsageSummary | null>>(
        { data: null },
        { status: 200 }
      );
    }

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

    const response = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/usage/summary",
      {
        enterprise,
        cost_center_id: userCostCenter.id,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    return NextResponse.json<ApiResponse<BillingUsageSummary | null>>(
      { data: response.data },
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
