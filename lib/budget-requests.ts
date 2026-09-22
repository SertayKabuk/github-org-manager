import type { Budget } from "@/lib/types/github";

/** Maximum total user-scoped budget a user may reach via self-service requests. */
export const SELF_SERVICE_BUDGET_REQUEST_MAX = 50;

/** Sums the amount of a user's own user-scoped budgets (there should be at most one). */
export function getUserScopedBudgetTotal(budgets: Budget[]): number {
  return budgets
    .filter((budget) => budget.budget_scope === "user")
    .reduce((sum, budget) => sum + (budget.budget_amount ?? 0), 0);
}
