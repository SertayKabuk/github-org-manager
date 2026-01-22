import { NextResponse } from "next/server";
import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { getSession } from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse, Budget, CostCenter } from "@/lib/types/github";
import { mapBudget } from "../../budgets/transformers";

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
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    // 1. Get all active cost centers to find the user's one
    const ccResponse = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/cost-centers",
      {
        enterprise,
        state: "active",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const allCostCenters: CostCenter[] = ccResponse.data.costCenters || [];
    const userCostCenter = allCostCenters.find(cc => 
      cc.resources.some(r => 
        r.type === "User" && r.name.toLowerCase() === login.toLowerCase()
      )
    );

    if (!userCostCenter) {
      return NextResponse.json<ApiResponse<Budget[]>>({ data: [] });
    }

    // 2. Get all budgets and filter by this cost center
    const budgetResponse = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/budgets",
      {
        enterprise,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const budgetsRaw = Array.isArray(budgetResponse.data?.budgets) ? budgetResponse.data.budgets : [];
    const allBudgets: Budget[] = budgetsRaw.map(mapBudget);
    
    // Filter budgets scoped to this cost center
    const userBudgets = allBudgets.filter(b => 
      b.budget_scope === "cost_center" && 
      b.budget_entity_name === userCostCenter.name
    );

    return NextResponse.json<ApiResponse<Budget[]>>({ data: userBudgets });
  } catch (error) {
    console.error("Error fetching user budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
      { status: 500 }
    );
  }
}
