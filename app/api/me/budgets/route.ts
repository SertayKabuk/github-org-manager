import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse, Budget } from "@/lib/types/github";
import * as CostCenterRepository from "@/lib/repositories/cost-center-repository";
import * as BudgetRepository from "@/lib/repositories/budget-repository";

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
    // 1. Get the user's cost center from cache
    const userCostCenter = await CostCenterRepository.findByLogin(login);

    // 2. Get budgets scoped directly to this user, plus any budgets on their cost center
    const [userBudgets, costCenterBudgets] = await Promise.all([
      BudgetRepository.findByUserLogin(login),
      userCostCenter ? BudgetRepository.findByCostCenterName(userCostCenter.name) : Promise.resolve([]),
    ]);

    return NextResponse.json<ApiResponse<Budget[]>>(
      { data: [...userBudgets, ...costCenterBudgets] },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error fetching user budgets.";
    return NextResponse.json<ApiResponse<Budget[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}