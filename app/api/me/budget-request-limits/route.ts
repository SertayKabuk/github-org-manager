import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/helpers";
import { getSession } from "@/lib/auth/session";
import type { ApiResponse } from "@/lib/types/github";
import type { BudgetRequestLimits } from "@/lib/budget-requests";
import { getBudgetRequestLimits } from "@/lib/services/budget-request-limits";

/**
 * GET /api/me/budget-request-limits
 * Current budget, company-wide default budget and allowed self-service request amounts for the current user.
 */
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
    const limits = await getBudgetRequestLimits(login);
    return NextResponse.json<ApiResponse<BudgetRequestLimits>>({ data: limits }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error fetching budget request limits.";
    return NextResponse.json<ApiResponse<BudgetRequestLimits | null>>(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
