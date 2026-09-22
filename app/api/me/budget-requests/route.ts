import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/helpers";
import { getSession } from "@/lib/auth/session";
import type { ApiResponse } from "@/lib/types/github";
import type { BudgetRequestEntity } from "@/lib/entities/budget-request";
import * as BudgetRepository from "@/lib/repositories/budget-repository";
import * as BudgetRequestRepository from "@/lib/repositories/budget-request-repository";
import { SELF_SERVICE_BUDGET_REQUEST_MAX, getUserScopedBudgetTotal } from "@/lib/budget-requests";

/**
 * GET /api/me/budget-requests
 * List the current user's own budget requests.
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
    const requests = await BudgetRequestRepository.findByRequester(login);
    return NextResponse.json<ApiResponse<BudgetRequestEntity[]>>({ data: requests }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error fetching budget requests.";
    return NextResponse.json<ApiResponse<BudgetRequestEntity[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/me/budget-requests
 * Submit a new self-service budget request, capped at $50 total.
 */
export async function POST(request: NextRequest) {
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

  let body: { requested_amount?: number; reason?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<BudgetRequestEntity | null>>(
      { data: null, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const requestedAmount = Number(body.requested_amount);

  if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) {
    return NextResponse.json<ApiResponse<BudgetRequestEntity | null>>(
      { data: null, error: "Requested amount must be a positive whole dollar amount." },
      { status: 400 }
    );
  }

  if (requestedAmount > SELF_SERVICE_BUDGET_REQUEST_MAX) {
    return NextResponse.json<ApiResponse<BudgetRequestEntity | null>>(
      {
        data: null,
        error: `Requested amount cannot exceed $${SELF_SERVICE_BUDGET_REQUEST_MAX.toFixed(2)}.`,
      },
      { status: 400 }
    );
  }

  try {
    const existingBudgets = await BudgetRepository.findByUserLogin(login);
    const currentTotal = getUserScopedBudgetTotal(existingBudgets);

    if (currentTotal >= SELF_SERVICE_BUDGET_REQUEST_MAX) {
      return NextResponse.json<ApiResponse<BudgetRequestEntity | null>>(
        {
          data: null,
          error: `You already have $${currentTotal.toFixed(2)} in budget, which meets or exceeds the $${SELF_SERVICE_BUDGET_REQUEST_MAX.toFixed(2)} self-service limit. Contact an admin if you need more.`,
        },
        { status: 400 }
      );
    }

    if (requestedAmount <= currentTotal) {
      return NextResponse.json<ApiResponse<BudgetRequestEntity | null>>(
        {
          data: null,
          error: `Requested amount must be greater than your current budget ($${currentTotal.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    const pending = await BudgetRequestRepository.findPendingByRequester(login);

    if (pending) {
      return NextResponse.json<ApiResponse<BudgetRequestEntity | null>>(
        {
          data: null,
          error: `You already have a pending request for $${Number(pending.requested_amount).toFixed(2)} submitted on ${new Date(pending.created_at).toLocaleDateString()}. Please wait for it to be reviewed.`,
        },
        { status: 409 }
      );
    }

    const created = await BudgetRequestRepository.create({
      requested_by: login,
      requested_amount: requestedAmount,
      current_budget_amount: currentTotal,
      reason: body.reason?.trim() || null,
    });

    return NextResponse.json<ApiResponse<BudgetRequestEntity>>({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error creating budget request.";
    return NextResponse.json<ApiResponse<BudgetRequestEntity | null>>(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
