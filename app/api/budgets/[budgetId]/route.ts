import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type { ApiResponse, BudgetDeleteResult } from "@/lib/types/github";

type DeleteBudgetParams = Promise<{ budgetId: string }>;

interface GitHubDeleteBudgetResponse {
  message?: string;
  id?: string;
  budget_id?: string;
}

type DeleteBudgetContext = {
  params: DeleteBudgetParams;
};

export async function DELETE(
  _request: NextRequest,
  context: DeleteBudgetContext
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const params = await context.params;
  const budgetId = params.budgetId;

  if (!budgetId) {
    return NextResponse.json<ApiResponse<BudgetDeleteResult>>(
      { data: { message: "Budget ID is required.", id: "" } },
      { status: 400 }
    );
  }

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const response = await octokit.request(
      "DELETE /enterprises/{enterprise}/settings/billing/budgets/{budget_id}",
      {
        enterprise,
        budget_id: budgetId,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const payload = response.data as GitHubDeleteBudgetResponse;

    return NextResponse.json<ApiResponse<BudgetDeleteResult>>(
      {
        data: {
          message: payload.message ?? "Budget successfully deleted.",
          id: payload.id ?? payload.budget_id ?? budgetId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error deleting budget.";

    return NextResponse.json<ApiResponse<BudgetDeleteResult>>(
      { data: { message, id: budgetId } },
      { status: 500 }
    );
  }
}
