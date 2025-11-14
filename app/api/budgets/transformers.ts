import type { Budget } from "@/lib/types/github";

export interface RawBudgetPayload {
  id?: string;
  budget_id?: string;
  budget_scope?: Budget["budget_scope"];
  budget_entity_name?: string;
  budget_amount?: number | string;
  prevent_further_usage?: boolean;
  budget_type?: Budget["budget_type"];
  budget_product_sku?: string;
  budget_product_skus?: string[];
  budget_alerting?: {
    will_alert?: boolean;
    alert_recipients?: string[];
  };
}

export function mapBudget(payload: RawBudgetPayload): Budget {
  const productSkus = Array.isArray(payload?.budget_product_skus)
    ? payload.budget_product_skus
    : payload?.budget_product_sku
      ? [payload.budget_product_sku]
      : [];

  return {
    id: String(payload?.id ?? payload?.budget_id ?? ""),
    budget_scope: payload?.budget_scope ?? "enterprise",
    budget_entity_name: payload?.budget_entity_name ?? "",
    budget_amount: typeof payload?.budget_amount === "number"
      ? payload.budget_amount
      : Number(payload?.budget_amount ?? 0),
    prevent_further_usage: Boolean(payload?.prevent_further_usage),
    budget_type: payload?.budget_type ?? "ProductPricing",
    budget_product_skus: productSkus,
    budget_product_sku: payload?.budget_product_sku ?? productSkus[0],
    budget_alerting: {
      will_alert: Boolean(payload?.budget_alerting?.will_alert),
      alert_recipients: Array.isArray(payload?.budget_alerting?.alert_recipients)
        ? payload.budget_alerting.alert_recipients
        : [],
    },
  };
}
