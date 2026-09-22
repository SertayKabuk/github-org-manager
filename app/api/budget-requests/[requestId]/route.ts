import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/helpers";
import { getSession } from "@/lib/auth/session";
import { getBillingOctokit, getEnterpriseName } from "@/lib/octokit";
import type { ApiResponse, Budget } from "@/lib/types/github";
import type { BudgetRequestEntity } from "@/lib/entities/budget-request";
import { mapBudget, RawBudgetPayload } from "@/app/api/budgets/transformers";
import * as BudgetRepository from "@/lib/repositories/budget-repository";
import * as BudgetRequestRepository from "@/lib/repositories/budget-request-repository";
import { query as dbQuery } from "@/lib/db";

type RouteParams = Promise<{ requestId: string }>;
type RouteContext = { params: RouteParams };

interface GitHubBudgetResponse {
  message?: string;
  budget?: RawBudgetPayload;
  budget_id?: string;
  id?: string;
}

interface ReviewBudgetRequestBody {
  action?: "approve" | "reject";
  amount?: number;
  expires_at?: string;
  note?: string;
}

const EXPIRES_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface BudgetRequestActionResult {
  request: BudgetRequestEntity;
  budget: Budget | null;
}

/**
 * PATCH /api/budget-requests/{requestId}
 * Approve (creating or updating the requester's user-scoped budget on GitHub) or
 * reject a pending budget request.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { requestId } = await context.params;
  const id = Number(requestId);

  if (!Number.isFinite(id)) {
    return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
      { data: null, error: "Invalid budget request id." },
      { status: 400 }
    );
  }

  let body: ReviewBudgetRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
      { data: null, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
      { data: null, error: "action must be 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  const budgetRequest = await BudgetRequestRepository.findById(id);

  if (!budgetRequest) {
    return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
      { data: null, error: "Budget request not found." },
      { status: 404 }
    );
  }

  if (budgetRequest.status !== "pending") {
    return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
      { data: null, error: `This request was already ${budgetRequest.status}.` },
      { status: 409 }
    );
  }

  const session = await getSession();
  const reviewer = session.user?.login ?? "admin";

  if (body.action === "reject") {
    const updated = await BudgetRequestRepository.review(id, "rejected", reviewer, {
      note: body.note?.trim() || null,
    });

    if (!updated) {
      return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
        { data: null, error: "This request was already reviewed." },
        { status: 409 }
      );
    }

    return NextResponse.json<ApiResponse<BudgetRequestActionResult>>(
      { data: { request: updated, budget: null } },
      { status: 200 }
    );
  }

  // Approve: create or update the requester's user-scoped budget on GitHub.
  const amount = Number(body.amount ?? budgetRequest.requested_amount);

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
      { data: null, error: "Approved amount must be a positive whole dollar amount." },
      { status: 400 }
    );
  }

  if (body.expires_at !== undefined && !EXPIRES_AT_PATTERN.test(body.expires_at)) {
    return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
      { data: null, error: "expires_at must be a date in YYYY-MM-DD format." },
      { status: 400 }
    );
  }

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getBillingOctokit();
    const login = budgetRequest.requested_by;

    const existingBudgets = await BudgetRepository.findByUserLogin(login);
    const existingBudget = existingBudgets[0];

    const response = existingBudget
      ? await octokit.request("PATCH /enterprises/{enterprise}/settings/billing/budgets/{budget_id}", {
          enterprise,
          budget_id: existingBudget.id,
          budget_amount: amount,
          prevent_further_usage: true,
          ...(body.expires_at ? { expires_at: body.expires_at } : {}),
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        })
      : await octokit.request("POST /enterprises/{enterprise}/settings/billing/budgets", {
          enterprise,
          budget_amount: amount,
          prevent_further_usage: true,
          budget_scope: "user",
          budget_entity_name: "",
          budget_type: "BundlePricing",
          budget_product_sku: "ai_credits",
          user: login,
          ...(body.expires_at ? { expires_at: body.expires_at } : {}),
          headers: { "X-GitHub-Api-Version": "2022-11-28" },
        });

    const payload = response.data as GitHubBudgetResponse;
    const budgetData = payload?.budget
      ? mapBudget(payload.budget)
      : mapBudget({
          id: payload?.budget_id ?? payload?.id ?? existingBudget?.id ?? "",
          budget_scope: "user",
          user: login,
          budget_amount: amount,
          prevent_further_usage: true,
          budget_type: "BundlePricing",
          budget_product_sku: "ai_credits",
          expires_at: body.expires_at ?? null,
        });

    // Keep the local cache fresh instead of waiting for the next sync cycle.
    await BudgetRepository.upsert(budgetData);

    if (!existingBudget) {
      await dbQuery(
        `INSERT INTO budget_transactions (transaction_type, from_user, to_user, amount, transferred_amount, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ["create", null, login, amount, 0, `Approved budget request #${id}`]
      );
    }

    const updated = await BudgetRequestRepository.review(id, "approved", reviewer, {
      note: body.note?.trim() || null,
      resultingBudgetId: budgetData.id,
    });

    if (!updated) {
      return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
        { data: null, error: "This request was already reviewed." },
        { status: 409 }
      );
    }

    return NextResponse.json<ApiResponse<BudgetRequestActionResult>>(
      { data: { request: updated, budget: budgetData } },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error approving budget request.";
    return NextResponse.json<ApiResponse<BudgetRequestActionResult | null>>(
      { data: null, error: message },
      { status: 500 }
    );
  }
}
