import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAuth } from "@/lib/auth/helpers";
import type {
  ApiResponse,
  Budget,
  BudgetCreateResult,
  CreateBudgetInput,
  BudgetScope,
  BudgetType,
} from "@/lib/types/github";
import { mapBudget, RawBudgetPayload } from "./transformers";

const BUDGET_SCOPES = new Set<BudgetScope>(["enterprise", "organization", "repository", "cost_center"]);
const BUDGET_TYPES = new Set<BudgetType>(["ProductPricing", "SkuPricing"]);

interface GitHubCreateBudgetResponse {
  message?: string;
  budget?: RawBudgetPayload;
  budget_id?: string;
  id?: string;
}

function validateBudgetPayload(body: CreateBudgetInput): string | null {
  if (!Number.isFinite(body.budget_amount) || body.budget_amount < 0) {
    return "Budget amount must be a non-negative number.";
  }

  if (!body.budget_product_sku?.trim()) {
    return "Budget product SKU is required.";
  }

  if (!BUDGET_SCOPES.has(body.budget_scope)) {
    return "Invalid budget scope provided.";
  }

  if (!BUDGET_TYPES.has(body.budget_type)) {
    return "Invalid budget type provided.";
  }

  if (!body.budget_alerting || typeof body.budget_alerting.will_alert !== "boolean") {
    return "Budget alerting configuration must include 'will_alert'.";
  }

  if (!Array.isArray(body.budget_alerting.alert_recipients)) {
    return "Alert recipients must be an array of usernames.";
  }

  if (body.budget_alerting.alert_recipients.some((recipient) => typeof recipient !== "string")) {
    return "All alert recipients must be strings.";
  }

  return null;
}

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const response = await octokit.request("GET /enterprises/{enterprise}/settings/billing/budgets", {
      enterprise,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const budgetsRaw = Array.isArray(response.data?.budgets) ? response.data.budgets : [];
    const data: Budget[] = budgetsRaw.map(mapBudget);

    return NextResponse.json<ApiResponse<Budget[]>>({ data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error fetching budgets.";

    return NextResponse.json<ApiResponse<Budget[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  let body: CreateBudgetInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<BudgetCreateResult>>(
      { data: { message: "Invalid JSON payload.", budget: null } },
      { status: 400 }
    );
  }

  const validationError = validateBudgetPayload(body);
  if (validationError) {
    return NextResponse.json<ApiResponse<BudgetCreateResult>>(
      { data: { message: validationError, budget: null } },
      { status: 400 }
    );
  }

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const response = await octokit.request("POST /enterprises/{enterprise}/settings/billing/budgets", {
      enterprise,
      budget_amount: body.budget_amount,
      prevent_further_usage: body.prevent_further_usage,
      budget_scope: body.budget_scope,
      budget_entity_name: body.budget_entity_name ?? "",
      budget_type: body.budget_type,
      budget_product_sku: body.budget_product_sku,
      budget_alerting: body.budget_alerting,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const payload = response.data as GitHubCreateBudgetResponse;
    const budgetData = payload?.budget
      ? mapBudget(payload.budget)
      : mapBudget({
          ...body,
          id: payload?.budget_id ?? payload?.id ?? "",
          budget_product_skus: [body.budget_product_sku],
        });

    const message: string = payload?.message ?? "Budget successfully created.";

    return NextResponse.json<ApiResponse<BudgetCreateResult>>(
      { data: { message, budget: budgetData } },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error creating budget.";

    return NextResponse.json<ApiResponse<BudgetCreateResult>>(
      { data: { message, budget: null } },
      { status: 500 }
    );
  }
}
