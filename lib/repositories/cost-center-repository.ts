import { query } from "@/lib/db";
import type { CostCenter } from "@/lib/types/github";

export interface CostCenterEntity {
  id: string;
  name: string;
  data: CostCenter;
  updated_at: Date;
}

/**
 * Find all cost centers from cache.
 */
export async function findAll(): Promise<CostCenterEntity[]> {
  return query<CostCenterEntity>("SELECT * FROM cost_centers ORDER BY name ASC");
}

/**
 * Upsert a cost center into cache.
 */
export async function upsert(costCenter: CostCenter): Promise<CostCenterEntity> {
  const results = await query<CostCenterEntity>(
    `INSERT INTO cost_centers (id, name, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       data = EXCLUDED.data,
       updated_at = NOW()
     RETURNING *`,
    [costCenter.id, costCenter.name, JSON.stringify(costCenter)]
  );
  return results[0];
}

/**
 * Remove cost centers not in the provided list of IDs.
 */
export async function sync(costCenters: CostCenter[]): Promise<void> {
  const ids = costCenters.map(cc => cc.id);
  
  // Upsert all current ones
  for (const cc of costCenters) {
    await upsert(cc);
  }

  // Delete ones that no longer exist
  if (ids.length > 0) {
    await query("DELETE FROM cost_centers WHERE id NOT IN (" + ids.map((_, i) => `$${i + 1}`).join(",") + ")", ids);
  } else {
    await query("DELETE FROM cost_centers");
  }
}

/**
 * Find cost center by user login.
 */
export async function findByLogin(login: string): Promise<CostCenter | null> {
  const results = await query<CostCenterEntity>(
    `SELECT * FROM cost_centers 
     WHERE data->'resources' @> $1::jsonb`,
    [JSON.stringify([{ type: "User", name: login }])]
  );
  
  // Note: GitHub resource names are case-insensitive usually. 
  // The @> operator is exact. If we need case-insensitive, we might need to fetch all and filter or use a more complex query.
  // For now, let's try to match exactly or fetch all if not found.
  
  if (results.length > 0) return results[0].data;

  // Fallback for case-insensitivity: fetch all and filter in JS
  const all = await findAll();
  const found = all.find(cc => 
    cc.data.resources.some(r => 
      r.type === "User" && r.name.toLowerCase() === login.toLowerCase()
    )
  );

  return found ? found.data : null;
}
