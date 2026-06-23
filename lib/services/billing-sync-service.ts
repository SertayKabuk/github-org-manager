import { getSystemOctokit, getEnterpriseName } from "@/lib/octokit";
import * as CostCenterRepository from "@/lib/repositories/cost-center-repository";
import * as BudgetRepository from "@/lib/repositories/budget-repository";
import type { CostCenter, Budget } from "@/lib/types/github";
import { mapBudget } from "@/app/api/budgets/transformers";
import type { RawBudgetPayload } from "@/app/api/budgets/transformers";
import { fetchBillingPaginatedItems } from "@/lib/github-paginated-response";

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
    const costCenters = await fetchBillingPaginatedItems<CostCenter>({
      request: octokit.request,
      route: "GET /enterprises/{enterprise}/settings/billing/cost-centers",
      dataKey: "costCenters",
      parameters: {
        enterprise,
        state: "active",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    });
    await CostCenterRepository.sync(costCenters);
    console.log(`[Sync] Synced ${costCenters.length} cost centers.`);

    // 2. Sync Budgets
    console.log("[Sync] Fetching budgets...");
    const rawBudgets = await fetchBillingPaginatedItems<RawBudgetPayload>({
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
    const budgets: Budget[] = rawBudgets.map(mapBudget);
    await BudgetRepository.sync(budgets);
    console.log(`[Sync] Synced ${budgets.length} budgets.`);

    console.log("[Sync] Billing data sync completed successfully.");
  } catch (error) {
    console.error("[Sync] Error during billing data sync:", error);
    throw error;
  }
}
