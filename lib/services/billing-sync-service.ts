import { getSystemOctokit, getEnterpriseName } from "@/lib/octokit";
import * as CostCenterRepository from "@/lib/repositories/cost-center-repository";
import * as BudgetRepository from "@/lib/repositories/budget-repository";
import type { CostCenter, Budget } from "@/lib/types/github";
import { mapBudget } from "@/app/api/budgets/transformers";

/**
 * Service to sync billing-related data (cost centers and budgets) from GitHub Enterprise to local DB.
 */
export async function syncBillingData() {
  const enterprise = getEnterpriseName();
  const octokit = getSystemOctokit();

  console.log(`[Sync] Starting billing data sync for enterprise: ${enterprise}`);

  try {
    // 1. Sync Cost Centers
    console.log("[Sync] Fetching cost centers...");
    const ccResponse = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/cost-centers",
      {
        enterprise,
        state: "active",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const costCenters: CostCenter[] = ccResponse.data.costCenters || [];
    await CostCenterRepository.sync(costCenters);
    console.log(`[Sync] Synced ${costCenters.length} cost centers.`);

    // 2. Sync Budgets
    console.log("[Sync] Fetching budgets...");
    const budgetResponse = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/budgets",
      {
        enterprise,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const rawBudgets = budgetResponse.data.budgets || [];
    const budgets: Budget[] = rawBudgets.map(mapBudget);
    await BudgetRepository.sync(budgets);
    console.log(`[Sync] Synced ${budgets.length} budgets.`);

    console.log("[Sync] Billing data sync completed successfully.");
  } catch (error) {
    console.error("[Sync] Error during billing data sync:", error);
    throw error;
  }
}
