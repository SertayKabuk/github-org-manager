import type { BillingUsageItem, Budget } from "@/lib/types/github";
import { SkuName } from "@/lib/types/github";

const PREMIUM_REQUEST_BUNDLE_SKUS = new Set<string>([
  SkuName.copilot_agent_premium_request,
  SkuName.copilot_premium_request,
  SkuName.spark_premium_request,
]);

function normalizeUsageKey(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesUsageItem(
  budget: Pick<Budget, "budget_product_sku" | "budget_type">,
  item: BillingUsageItem
) {
  const budgetKey = normalizeUsageKey(budget.budget_product_sku);

  if (!budgetKey) {
    return false;
  }

  const productKey = normalizeUsageKey(item.product);
  const skuKey = normalizeUsageKey(item.sku);

  switch (budget.budget_type) {
    case "ProductPricing":
      return productKey === budgetKey || skuKey === budgetKey;
    case "SkuPricing":
      return skuKey === budgetKey;
    case "BundlePricing":
      if (budgetKey === "premium_requests") {
        return PREMIUM_REQUEST_BUNDLE_SKUS.has(skuKey);
      }

      return skuKey === budgetKey || productKey === budgetKey;
    default:
      return skuKey === budgetKey || productKey === budgetKey;
  }
}

export function getSpentAmountForBudget(
  budget: Pick<Budget, "budget_product_sku" | "budget_type">,
  usageItems: BillingUsageItem[]
) {
  return usageItems.reduce((sum, item) => {
    if (!matchesUsageItem(budget, item)) {
      return sum;
    }

    return sum + Number(item.netAmount ?? 0);
  }, 0);
}

export function buildBudgetUsageMap(
  budgets: Budget[],
  usageItems: BillingUsageItem[]
) {
  return budgets.reduce<Record<string, number>>((acc, budget) => {
    acc[budget.id] = getSpentAmountForBudget(budget, usageItems);
    return acc;
  }, {});
}
