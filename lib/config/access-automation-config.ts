import * as accessAutomationSettingsRepository from "@/lib/repositories/access-automation-settings-repository";

export interface AccessAutomationRule {
  id: number;
  ruleName: string;
  targetOrg: string | null;
  targetTeamSlug: string | null;
  targetTeamId: number | null;
  targetUsername: string | null;
  enableGrantOnAdd: boolean;
  enableRevokeOnRemove: boolean;
  enableRevokeOnTeamMemberRemove: boolean;
  dryRun: boolean;
  repositoryAllowlist: Set<string>;
  repositoryDenylist: Set<string>;
}

export interface AccessAutomationConfig {
  rules: AccessAutomationRule[];
}

function normalizeListValue(value: string): string {
  return value.trim().toLowerCase();
}

function parseList(value: string | undefined): Set<string> {
  if (typeof value !== "string" || value.trim() === "") {
    return new Set<string>();
  }

  return new Set(
    value
      .split(/[\n,;]/)
      .map(normalizeListValue)
      .filter(Boolean)
  );
}

function normalizeOptionalValue(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toMultilineString(value: Set<string>): string | null {
  return value.size > 0 ? Array.from(value).join("\n") : null;
}

export async function getAccessAutomationConfig(): Promise<AccessAutomationConfig> {
  const rules = await accessAutomationSettingsRepository.listRules();

  return {
    rules: rules.map((rule) => ({
      id: rule.id,
      ruleName: rule.rule_name,
      targetOrg: normalizeOptionalValue(rule.target_org ?? undefined)?.toLowerCase() ?? null,
      targetTeamSlug:
        normalizeOptionalValue(rule.target_team_slug ?? undefined)?.toLowerCase() ?? null,
      targetTeamId: rule.target_team_id ?? null,
      targetUsername:
        normalizeOptionalValue(rule.target_username ?? undefined)?.toLowerCase() ?? null,
      enableGrantOnAdd: rule.enable_grant_on_add,
      enableRevokeOnRemove: rule.enable_revoke_on_remove,
      enableRevokeOnTeamMemberRemove: rule.enable_revoke_on_team_member_remove,
      dryRun: rule.dry_run,
      repositoryAllowlist: parseList(rule.repository_allowlist ?? undefined),
      repositoryDenylist: parseList(rule.repository_denylist ?? undefined),
    })),
  };
}

export function getAccessAutomationWebhookSecret(): string | null {
  return normalizeOptionalValue(process.env.GITHUB_WEBHOOK_SECRET)
    ?? normalizeOptionalValue(process.env.WEBHOOK_SECRET);
}

export function mapConfigToFormValues(config: AccessAutomationConfig) {
  return {
    rules: config.rules.map((rule) => ({
      id: rule.id,
      ruleName: rule.ruleName,
      targetOrg: rule.targetOrg ?? "",
      targetTeamSlug: rule.targetTeamSlug ?? "",
      targetTeamId: rule.targetTeamId?.toString() ?? "",
      targetUsername: rule.targetUsername ?? "",
      enableGrantOnAdd: rule.enableGrantOnAdd,
      enableRevokeOnRemove: rule.enableRevokeOnRemove,
      enableRevokeOnTeamMemberRemove: rule.enableRevokeOnTeamMemberRemove,
      dryRun: rule.dryRun,
      repositoryAllowlist: toMultilineString(rule.repositoryAllowlist) ?? "",
      repositoryDenylist: toMultilineString(rule.repositoryDenylist) ?? "",
    })),
  };
}

export function isRuleEnabled(rule: AccessAutomationRule): boolean {
  return Boolean(
    rule.targetOrg &&
      rule.targetUsername &&
      (rule.targetTeamSlug || rule.targetTeamId)
  );
}

export function matchesTargetTeam(
  rule: AccessAutomationRule,
  teamId: number | null,
  teamSlug: string | null
): boolean {
  const slugMatches =
    !rule.targetTeamSlug ||
    (typeof teamSlug === "string" && teamSlug.toLowerCase() === rule.targetTeamSlug);
  const idMatches = !rule.targetTeamId || teamId === rule.targetTeamId;

  return slugMatches && idMatches;
}

export function isRepositoryAllowed(
  rule: AccessAutomationRule,
  repositoryFullName: string
): boolean {
  const normalizedFullName = repositoryFullName.trim().toLowerCase();
  const repositoryName = normalizedFullName.split("/").at(-1) ?? normalizedFullName;

  if (
    rule.repositoryDenylist.has(normalizedFullName) ||
    rule.repositoryDenylist.has(repositoryName)
  ) {
    return false;
  }

  if (rule.repositoryAllowlist.size === 0) {
    return true;
  }

  return (
    rule.repositoryAllowlist.has(normalizedFullName) ||
    rule.repositoryAllowlist.has(repositoryName)
  );
}
