import { query } from "@/lib/db";
import { getClient } from "@/lib/db";
import type {
  AccessAutomationRuleEntity,
  UpsertAccessAutomationRuleEntity,
} from "@/lib/entities/access-automation-settings";

export async function listRules(): Promise<AccessAutomationRuleEntity[]> {
  return query<AccessAutomationRuleEntity>(
    `SELECT * FROM access_automation_rules ORDER BY order_index ASC, id ASC`
  );
}

export async function replaceRules(
  rules: UpsertAccessAutomationRuleEntity[]
): Promise<AccessAutomationRuleEntity[]> {
  const client = await getClient();

  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM access_automation_rules`);

    const insertedRules: AccessAutomationRuleEntity[] = [];

    for (const rule of rules) {
      const result = await client.query<AccessAutomationRuleEntity>(
        `INSERT INTO access_automation_rules (
          rule_name,
          target_org,
          target_team_slug,
          target_team_id,
          target_username,
          enable_grant_on_add,
          enable_revoke_on_remove,
          enable_revoke_on_team_member_remove,
          dry_run,
          repository_allowlist,
          repository_denylist,
          order_index,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING *`,
        [
          rule.rule_name,
          rule.target_org,
          rule.target_team_slug,
          rule.target_team_id,
          rule.target_username,
          rule.enable_grant_on_add,
          rule.enable_revoke_on_remove,
          rule.enable_revoke_on_team_member_remove,
          rule.dry_run,
          rule.repository_allowlist,
          rule.repository_denylist,
          rule.order_index,
        ]
      );

      insertedRules.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return insertedRules;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}