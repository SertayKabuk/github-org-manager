import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getBillingOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type {
  ApiResponse,
  BudgetDeleteResult,
  BudgetScope,
  BudgetType,
  BudgetUpdateResult,
  UpdateBudgetInput,
} from "@/lib/types/github";
import { mapBudget, RawBudgetPayload } from "../transformers";
import * as BudgetRepository from "@/lib/repositories/budget-repository";

type DeleteBudgetParams = Promise<{ budgetId: string }>;

interface GitHubDeleteBudgetResponse {
  message?: string;
  id?: string;
  budget_id?: string;
}

interface GitHubUpdateBudgetResponse {
  message?: string;
  budget?: RawBudgetPayload;
  budget_id?: string;
  id?: string;
}

type DeleteBudgetContext = {
  params: DeleteBudgetParams;
};

const BUDGET_SCOPES = new Set<BudgetScope>(["enterprise", "organization", "repository", "cost_center", "user", "multi_user_customer"]);
const BUDGET_TYPES = new Set<BudgetType>(["ProductPricing", "SkuPricing", "BundlePricing"]);
const EXPIRES_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validateUpdateBudgetPayload(body: UpdateBudgetInput): string | null {
  if (body.budget_amount !== undefined && (!Number.isFinite(body.budget_amount) || body.budget_amount < 0)) {
    return "Budget amount must be a non-negative number.";
  }

  if (body.budget_scope !== undefined && !BUDGET_SCOPES.has(body.budget_scope)) {
    return "Invalid budget scope provided.";
  }

  if (body.budget_type !== undefined && !BUDGET_TYPES.has(body.budget_type)) {
    return "Invalid budget type provided.";
  }

  if (body.budget_alerting !== undefined) {
    if (typeof body.budget_alerting.will_alert !== "boolean") {
      return "Budget alerting configuration must include 'will_alert'.";
    }

    if (!Array.isArray(body.budget_alerting.alert_recipients)) {
      return "Alert recipients must be an array of usernames.";
    }

    if (body.budget_alerting.alert_recipients.some((recipient) => typeof recipient !== "string")) {
      return "All alert recipients must be strings.";
    }
  }

  if (body.expires_at !== undefined && body.expires_at !== null && !EXPIRES_AT_PATTERN.test(body.expires_at)) {
    return "expires_at must be a date in YYYY-MM-DD format, or null to clear it.";
  }

  return null;
}

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
    const octokit = await getBillingOctokit();

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

    // Keep the local cache (used by personal pages) in sync instead of waiting for the next cron sync.
    await BudgetRepository.remove(budgetId);

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

export async function PATCH(
  request: NextRequest,
  context: DeleteBudgetContext
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const params = await context.params;
  const budgetId = params.budgetId;

  if (!budgetId) {
    return NextResponse.json<ApiResponse<BudgetUpdateResult>>(
      { data: { message: "Budget ID is required.", budget: null } },
      { status: 400 }
    );
  }

  let body: UpdateBudgetInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<BudgetUpdateResult>>(
      { data: { message: "Invalid JSON payload.", budget: null } },
      { status: 400 }
    );
  }

  const validationError = validateUpdateBudgetPayload(body);
  if (validationError) {
    return NextResponse.json<ApiResponse<BudgetUpdateResult>>(
      { data: { message: validationError, budget: null } },
      { status: 400 }
    );
  }

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getBillingOctokit();

    const response = await octokit.request(
      "PATCH /enterprises/{enterprise}/settings/billing/budgets/{budget_id}",
      {
        enterprise,
        budget_id: budgetId,
        ...(body.budget_amount !== undefined ? { budget_amount: body.budget_amount } : {}),
        ...(body.prevent_further_usage !== undefined ? { prevent_further_usage: body.prevent_further_usage } : {}),
        ...(body.budget_scope !== undefined ? { budget_scope: body.budget_scope } : {}),
        ...(body.budget_entity_name !== undefined ? { budget_entity_name: body.budget_entity_name } : {}),
        ...(body.user !== undefined ? { user: body.user } : {}),
        ...(body.budget_type !== undefined ? { budget_type: body.budget_type } : {}),
        ...(body.budget_product_sku !== undefined ? { budget_product_sku: body.budget_product_sku } : {}),
        ...(body.budget_alerting !== undefined ? { budget_alerting: body.budget_alerting } : {}),
        ...(body.expires_at !== undefined ? { expires_at: body.expires_at } : {}),
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const payload = response.data as GitHubUpdateBudgetResponse;
    const budgetData = payload?.budget ? mapBudget(payload.budget) : null;

    if (budgetData) {
      await BudgetRepository.upsert(budgetData);
    }

    return NextResponse.json<ApiResponse<BudgetUpdateResult>>(
      {
        data: {
          message: payload?.message ?? "Budget successfully updated.",
          budget: budgetData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error updating budget.";

    return NextResponse.json<ApiResponse<BudgetUpdateResult>>(
      { data: { message, budget: null } },
      { status: 500 }
    );
  }
}
