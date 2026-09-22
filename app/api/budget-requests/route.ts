import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/helpers";
import type { ApiResponse } from "@/lib/types/github";
import type { BudgetRequestEntity } from "@/lib/entities/budget-request";
import * as BudgetRequestRepository from "@/lib/repositories/budget-request-repository";

/**
 * GET /api/budget-requests
 * List all budget requests, optionally filtered by status.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const status = request.nextUrl.searchParams.get("status");

  try {
    const requests = await BudgetRequestRepository.findAll(status || undefined);
    return NextResponse.json<ApiResponse<BudgetRequestEntity[]>>({ data: requests }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error fetching budget requests.";
    return NextResponse.json<ApiResponse<BudgetRequestEntity[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}
