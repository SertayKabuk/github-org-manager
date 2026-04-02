export interface AccessAutomationRuleEntity {
  id: number;
  rule_name: string;
  target_org: string;
  target_team_slug: string | null;
  target_team_id: number | null;
  target_username: string;
  enable_grant_on_add: boolean;
  enable_revoke_on_remove: boolean;
  enable_revoke_on_team_member_remove: boolean;
  dry_run: boolean;
  repository_allowlist: string | null;
  repository_denylist: string | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export interface UpsertAccessAutomationRuleEntity {
  id?: number;
  rule_name: string;
  target_org: string;
  target_team_slug: string | null;
  target_team_id: number | null;
  target_username: string;
  enable_grant_on_add: boolean;
  enable_revoke_on_remove: boolean;
  enable_revoke_on_team_member_remove: boolean;
  dry_run: boolean;
  repository_allowlist: string | null;
  repository_denylist: string | null;
  order_index: number;
}