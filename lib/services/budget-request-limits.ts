import * as BudgetRepository from "@/lib/repositories/budget-repository";
import {
  SELF_SERVICE_BUDGET_REQUEST_MAX,
  SELF_SERVICE_BUDGET_REQUEST_STEP,
  getDefaultUserBudgetAmount,
  getSelfServiceRequestOptions,
  getUserScopedBudgetTotal,
  type BudgetRequestLimits,
} from "@/lib/budget-requests";

/**
 * Resolves a user's self-service budget request limits from the cached budgets.
 * The default budget comes from the company-wide per-user budget configured on GitHub.
 */
export async function getBudgetRequestLimits(login: string): Promise<BudgetRequestLimits> {
  const [userBudgets, companyWideBudgets] = await Promise.all([
    BudgetRepository.findByUserLogin(login),
    BudgetRepository.findCompanyWideUserBudgets(),
  ]);

  const defaultBudget = getDefaultUserBudgetAmount(companyWideBudgets);
  const currentBudget = getUserScopedBudgetTotal(userBudgets, defaultBudget);

  return {
    current_budget: currentBudget,
    default_budget: defaultBudget,
    max: SELF_SERVICE_BUDGET_REQUEST_MAX,
    step: SELF_SERVICE_BUDGET_REQUEST_STEP,
    options: getSelfServiceRequestOptions(currentBudget),
  };
}
