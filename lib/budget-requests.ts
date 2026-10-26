import type { Budget } from "@/lib/types/github";

/** Used as the default per-user budget only when no company-wide budget is configured. */
export const FALLBACK_DEFAULT_USER_BUDGET_AMOUNT = 50;

/** Maximum total user-scoped budget a user may reach via self-service requests. */
export const SELF_SERVICE_BUDGET_REQUEST_MAX = 70;

/** Self-service requests must land on multiples of this amount. */
export const SELF_SERVICE_BUDGET_REQUEST_STEP = 10;

/** Self-service request limits resolved for a specific user. */
export interface BudgetRequestLimits {
  current_budget: number;
  default_budget: number;
  max: number;
  step: number;
  options: number[];
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

/** Amounts a user may request: each $10 step above their current budget, up to the self-service max. */
export function getSelfServiceRequestOptions(currentTotal: number): number[] {
  const step = SELF_SERVICE_BUDGET_REQUEST_STEP;
  const options: number[] = [];
  for (let amount = (Math.floor(currentTotal / step) + 1) * step; amount <= SELF_SERVICE_BUDGET_REQUEST_MAX; amount += step) {
    options.push(amount);
  }
  return options;
}
