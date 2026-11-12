import type { Budget } from "@/lib/types/github";

/** Used as the default per-user budget only when no company-wide budget is configured. */
export const FALLBACK_DEFAULT_USER_BUDGET_AMOUNT = 50;

/** Each self-service request raises the user's budget by exactly this amount, with no upper cap. */
export const SELF_SERVICE_BUDGET_REQUEST_STEP = 10;

/** Self-service request limits resolved for a specific user. */
export interface BudgetRequestLimits {
  current_budget: number;
  default_budget: number;
  step: number;
  /** The single total a user may request: current budget + step. */
  requestable_amount: number;
}

/**
 * Finds the company-wide per-user budget (scope "multi_user_customer"),
 * preferring the AI credits SKU that user-scoped budgets also use.
 */
export function findCompanyWideUserBudget(budgets: Budget[]): Budget | undefined {
  const companyWide = budgets.filter((budget) => budget.budget_scope === "multi_user_customer");
  return companyWide.find((budget) => budget.budget_product_sku === "ai_credits") ?? companyWide[0];
}

/** The default budget every user has when they have no user-scoped budget of their own. */
export function getDefaultUserBudgetAmount(budgets: Budget[]): number {
  return findCompanyWideUserBudget(budgets)?.budget_amount ?? FALLBACK_DEFAULT_USER_BUDGET_AMOUNT;
}

/**
 * Returns the user's effective budget: the sum of their user-scoped budgets
 * (there should be at most one), or the default budget if they have none.
 */
export function getUserScopedBudgetTotal(budgets: Budget[], defaultAmount: number): number {
  const userBudgets = budgets.filter((budget) => budget.budget_scope === "user");
  if (userBudgets.length === 0) return defaultAmount;
  return userBudgets.reduce((sum, budget) => sum + (budget.budget_amount ?? 0), 0);
}

/** The new total a user may request: their current budget plus one $10 step, regardless of how high it already is. */
export function getSelfServiceRequestableAmount(currentTotal: number): number {
  return currentTotal + SELF_SERVICE_BUDGET_REQUEST_STEP;
}
