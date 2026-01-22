import { query } from "@/lib/db";
import type { Budget } from "@/lib/types/github";

export interface BudgetEntity {
  id: string;
  name: string | null;
  data: Budget;
  updated_at: Date;
}

/**
 * Find all budgets from cache.
 */
export async function findAll(): Promise<BudgetEntity[]> {
  return query<BudgetEntity>("SELECT * FROM budgets");
}

/**
 * Upsert a budget into cache.
 */
export async function upsert(budget: Budget): Promise<BudgetEntity> {
  const results = await query<BudgetEntity>(
    `INSERT INTO budgets (id, name, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       data = EXCLUDED.data,
       updated_at = NOW()
     RETURNING *`,
    [budget.id, budget.budget_entity_name || null, JSON.stringify(budget)]
  );
  return results[0];
}

/**
 * Sync budgets by upserting current ones and deleting old ones.
 */
export async function sync(budgets: Budget[]): Promise<void> {
  const ids = budgets.map(b => b.id);
  
  for (const b of budgets) {
    await upsert(b);
  }

  if (ids.length > 0) {
    await query("DELETE FROM budgets WHERE id NOT IN (" + ids.map((_, i) => `$${i + 1}`).join(",") + ")", ids);
  } else {
    await query("DELETE FROM budgets");
  }
}

/**
 * Find budgets by cost center name.
 */
export async function findByCostCenterName(costCenterName: string): Promise<Budget[]> {
  const results = await query<BudgetEntity>(
    "SELECT * FROM budgets WHERE name = $1 AND data->>'budget_scope' = 'cost_center'",
    [costCenterName]
  );
  return results.map(r => r.data);
}
