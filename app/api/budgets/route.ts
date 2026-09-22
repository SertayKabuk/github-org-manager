import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getBillingOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type {
  ApiResponse,
  Budget,
  BudgetCreateResult,
  CreateBudgetInput,
  BudgetScope,
  BudgetType,
} from "@/lib/types/github";
import { mapBudget, RawBudgetPayload } from "./transformers";
import { query as dbQuery } from "@/lib/db";
import { fetchBillingPaginatedItems } from "@/lib/github-paginated-response";
import * as BudgetRepository from "@/lib/repositories/budget-repository";

const BUDGET_SCOPES = new Set<BudgetScope>(["enterprise", "organization", "repository", "cost_center", "user", "multi_user_customer"]);
const BUDGET_TYPES = new Set<BudgetType>(["ProductPricing", "SkuPricing", "BundlePricing"]);

interface GitHubCreateBudgetResponse {
  message?: string;
  budget?: RawBudgetPayload;
  budget_id?: string;
  id?: string;
}

type BudgetAlertingInput = CreateBudgetInput["budget_alerting"];

interface BudgetTransferInput {
  fromUser: string;
  fromUserBudgetId: string;
  fromUserSpent: number;
  remaining: number;
  fromUserBudgetScope?: string;
}

const EXPIRES_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// GitHub rejects budget_alerting for user-scope budgets and only accepts expires_at for them.
function scopedCreateFields(
  budgetScope: BudgetScope,
  budgetAlerting: BudgetAlertingInput | undefined,
  expiresAt: string | undefined
) {
  return {
    ...(budgetScope !== "user" && budgetAlerting ? { budget_alerting: budgetAlerting } : {}),
    ...(budgetScope === "user" && expiresAt ? { expires_at: expiresAt } : {}),
  };
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

  if (body.budget_scope === "user") {
    if (body.budget_alerting) {
      return "Budget alerting is not supported for user-scoped budgets.";
    }
  } else {
    if (!body.budget_alerting || typeof body.budget_alerting.will_alert !== "boolean") {
      return "Budget alerting configuration must include 'will_alert'.";
    }

    if (!Array.isArray(body.budget_alerting.alert_recipients)) {
      return "Alert recipients must be an array of usernames.";
    }

    if (body.budget_alerting.alert_recipients.some((recipient) => typeof recipient !== "string")) {
      return "All alert recipients must be strings.";
    }
  }

  if (body.expires_at !== undefined) {
    if (body.budget_scope !== "user") {
      return "expires_at is only supported for user-scoped budgets.";
    }

    if (!EXPIRES_AT_PATTERN.test(body.expires_at)) {
      return "expires_at must be a date in YYYY-MM-DD format.";
    }
  }

  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getBillingOctokit();
    const budgetsRaw = await fetchBillingPaginatedItems<RawBudgetPayload>({
      request: octokit.request,
      route: "GET /enterprises/{enterprise}/settings/billing/budgets",
      dataKey: "budgets",
      parameters: {
        enterprise,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    });
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
  const authError = await requireAdmin();
  if (authError) return authError;

  let body: CreateBudgetInput & {
    transfer?: BudgetTransferInput;
  };

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
    const octokit = await getBillingOctokit();

    if (body.transfer) {
      const {
        fromUser,
        fromUserBudgetId,
        fromUserSpent,
        remaining,
        fromUserBudgetScope,
      } = body.transfer;

      const targetUser = body.budget_scope === "user"
        ? body.user ?? body.budget_entity_name
        : undefined;
      const targetEntityName = body.budget_scope === "user"
        ? targetUser
        : body.budget_entity_name ?? "";
      const budgetsRaw = await fetchBillingPaginatedItems<RawBudgetPayload>({
        request: octokit.request,
        route: "GET /enterprises/{enterprise}/settings/billing/budgets",
        dataKey: "budgets",
        parameters: {
          enterprise,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      });
      const existingTargetBudget = budgetsRaw.find((budget) => {
        const budgetEntityName = body.budget_scope === "user"
          ? budget.user ?? budget.budget_entity_name
          : budget.budget_entity_name ?? "";

        return (
          budget.budget_scope === body.budget_scope &&
          budgetEntityName === targetEntityName &&
          budget.budget_product_sku === body.budget_product_sku &&
          budget.budget_type === body.budget_type &&
          (body.budget_scope !== "user" || Boolean(targetUser))
        );
      });

      // 1. Delete the existing budget of From User (only if it exists and is user-scoped)
      if (fromUserBudgetId && fromUserBudgetScope === "user") {
        try {
          await octokit.request("DELETE /enterprises/{enterprise}/settings/billing/budgets/{budget_id}", {
            enterprise,
            budget_id: fromUserBudgetId,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });
          await BudgetRepository.remove(fromUserBudgetId);
        } catch (err) {
          console.error("Failed to delete source user budget during transfer:", err);
          throw new Error("Failed to delete the old budget of the source user.");
        }
      }

      // 2. Create the adjusted budget for From User (equal to their spent amount, so they have $0 remaining)
      const adjustedAmount = Math.ceil(fromUserSpent);
      try {
        const adjustedResponse = await octokit.request("POST /enterprises/{enterprise}/settings/billing/budgets", {
          enterprise,
          budget_amount: adjustedAmount,
          prevent_further_usage: true,
          budget_scope: "user",
          budget_entity_name: "",
          budget_type: "BundlePricing",
          budget_product_sku: "ai_credits",
          user: fromUser,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        const adjustedPayload = adjustedResponse.data as GitHubCreateBudgetResponse;
        const adjustedBudgetData = adjustedPayload?.budget
          ? mapBudget(adjustedPayload.budget)
          : mapBudget({
              id: adjustedPayload?.budget_id ?? adjustedPayload?.id ?? "",
              budget_scope: "user",
              user: fromUser,
              budget_amount: adjustedAmount,
              prevent_further_usage: true,
              budget_type: "BundlePricing",
              budget_product_sku: "ai_credits",
            });
        await BudgetRepository.upsert(adjustedBudgetData);
      } catch (err) {
        console.error("Failed to create adjusted budget for source user during transfer:", err);
        throw new Error("Failed to create the adjusted budget for the source user.");
      }

      // 3. Update an existing matching target budget or create a new one
      const newAllocation = Math.ceil(body.budget_amount + remaining);
      const existingTargetBudgetId = existingTargetBudget?.id || existingTargetBudget?.budget_id;
      const existingTargetAmount = existingTargetBudget
        ? Number(existingTargetBudget.budget_amount)
        : 0;

      if (existingTargetBudget && !existingTargetBudgetId) {
        throw new Error("Existing target budget is missing a budget ID.");
      }

      if (existingTargetBudget && !Number.isFinite(existingTargetAmount)) {
        throw new Error("Existing target budget has an invalid budget amount.");
      }

      const targetAmount = existingTargetBudget
        ? Math.ceil(existingTargetAmount + newAllocation)
        : newAllocation;
      const targetResponse = existingTargetBudget
        ? await octokit.request("PATCH /enterprises/{enterprise}/settings/billing/budgets/{budget_id}", {
            enterprise,
            budget_id: existingTargetBudgetId,
            budget_amount: targetAmount,
            ...(body.budget_scope === "user"
              ? {
                  prevent_further_usage: true,
                  budget_scope: "user",
                  budget_entity_name: "",
                  budget_type: body.budget_type,
                  budget_product_sku: body.budget_product_sku,
                  user: targetUser,
                  ...(body.expires_at ? { expires_at: body.expires_at } : {}),
                }
              : {}),
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          })
        : await octokit.request("POST /enterprises/{enterprise}/settings/billing/budgets", {
            enterprise,
            budget_amount: targetAmount,
            prevent_further_usage: body.prevent_further_usage,
            budget_scope: body.budget_scope,
            budget_entity_name: body.budget_scope === "user" ? "" : (body.budget_entity_name ?? ""),
            budget_type: body.budget_type,
            budget_product_sku: body.budget_product_sku,
            ...scopedCreateFields(body.budget_scope, body.budget_alerting, body.expires_at),
            user: body.budget_scope === "user" ? (body.user ?? body.budget_entity_name) : undefined,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });

      const payload = targetResponse.data as GitHubCreateBudgetResponse;
      const budgetData = payload?.budget
        ? mapBudget(payload.budget)
        : mapBudget({
            ...body,
            budget_amount: targetAmount,
            id: payload?.budget_id ?? payload?.id ?? existingTargetBudgetId ?? "",
            budget_product_skus: [body.budget_product_sku],
          });
      await BudgetRepository.upsert(budgetData);

      // 4. Record transfer transaction to DB
      await dbQuery(
        `INSERT INTO budget_transactions (transaction_type, from_user, to_user, amount, transferred_amount, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['transfer', fromUser, body.budget_entity_name || "", body.budget_amount, remaining, body.note || null]
      );

      return NextResponse.json<ApiResponse<BudgetCreateResult>>(
        { data: { message: "Budget transfer completed successfully.", budget: budgetData } },
        { status: 201 }
      );
    } else {
      // Standard single budget creation
      const response = await octokit.request("POST /enterprises/{enterprise}/settings/billing/budgets", {
        enterprise,
        budget_amount: body.budget_amount,
        prevent_further_usage: body.prevent_further_usage,
        budget_scope: body.budget_scope,
        budget_entity_name: body.budget_scope === "user" ? "" : (body.budget_entity_name ?? ""),
        budget_type: body.budget_type,
        budget_product_sku: body.budget_product_sku,
        ...scopedCreateFields(body.budget_scope, body.budget_alerting, body.expires_at),
        user: body.budget_scope === "user" ? (body.user ?? body.budget_entity_name) : undefined,
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
      await BudgetRepository.upsert(budgetData);

      // Record create transaction to DB
      await dbQuery(
        `INSERT INTO budget_transactions (transaction_type, from_user, to_user, amount, transferred_amount, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['create', null, body.budget_entity_name || "", body.budget_amount, 0, body.note || null]
      );

      const message: string = payload?.message ?? "Budget successfully created.";

      return NextResponse.json<ApiResponse<BudgetCreateResult>>(
        { data: { message, budget: budgetData } },
        { status: 201 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error creating budget.";

    return NextResponse.json<ApiResponse<BudgetCreateResult>>(
      { data: { message, budget: null } },
      { status: 500 }
    );
  }
}
