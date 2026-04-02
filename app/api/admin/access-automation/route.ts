import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/helpers";
import {
  getAccessAutomationConfig,
  mapConfigToFormValues,
} from "@/lib/config/access-automation-config";
import * as accessAutomationSettingsRepository from "@/lib/repositories/access-automation-settings-repository";
import type { ApiResponse } from "@/lib/types/github";

type AccessAutomationApiResponse = ApiResponse<AccessAutomationSettingsResponse | null>;

interface AccessAutomationRuleResponse {
  id: number;
  ruleName: string;
  targetOrg: string;
  targetTeamSlug: string;
  targetTeamId: string;
  targetUsername: string;
  enableGrantOnAdd: boolean;
  enableRevokeOnRemove: boolean;
  enableRevokeOnTeamMemberRemove: boolean;
  dryRun: boolean;
  repositoryAllowlist: string;
  repositoryDenylist: string;
}

interface AccessAutomationSettingsResponse {
  rules: AccessAutomationRuleResponse[];
}

interface UpdateAccessAutomationRuleBody {
  id?: unknown;
  ruleName?: unknown;
  targetOrg?: unknown;
  targetTeamSlug?: unknown;
  targetTeamId?: unknown;
  targetUsername?: unknown;
  enableGrantOnAdd?: unknown;
  enableRevokeOnRemove?: unknown;
  enableRevokeOnTeamMemberRemove?: unknown;
  dryRun?: unknown;
  repositoryAllowlist?: unknown;
  repositoryDenylist?: unknown;
}

interface UpdateAccessAutomationSettingsBody {
  rules?: unknown;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTeamId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function validatePayload(payload: UpdateAccessAutomationSettingsBody): string | null {
  if (!Array.isArray(payload.rules)) {
    return "Rules must be an array.";
  }

  for (const [index, rawRule] of payload.rules.entries()) {
    const rule = rawRule as UpdateAccessAutomationRuleBody;
    const booleanFields = [
      rule.enableGrantOnAdd,
      rule.enableRevokeOnRemove,
      rule.enableRevokeOnTeamMemberRemove,
      rule.dryRun,
    ];

    if (booleanFields.some((value) => !isBoolean(value))) {
      return `Rule ${index + 1}: boolean settings must be true or false.`;
    }

    if (!normalizeNullableString(rule.ruleName)) {
      return `Rule ${index + 1}: rule name is required.`;
    }

    if (!normalizeNullableString(rule.targetOrg)) {
      return `Rule ${index + 1}: target organization is required.`;
    }

    if (!normalizeNullableString(rule.targetUsername)) {
      return `Rule ${index + 1}: target GitHub username is required.`;
    }

    const teamId = normalizeTeamId(rule.targetTeamId);
    const teamSlug = normalizeNullableString(rule.targetTeamSlug);

    if (!teamSlug && teamId === null) {
      return `Rule ${index + 1}: provide a team slug or team ID.`;
    }

    if (rule.targetTeamId !== undefined && teamId === null) {
      const rawValue = typeof rule.targetTeamId === "string" ? rule.targetTeamId.trim() : rule.targetTeamId;
      if (rawValue !== "" && rawValue !== null) {
        return `Rule ${index + 1}: target team ID must be a whole number.`;
      }
    }
  }

  return null;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const config = await getAccessAutomationConfig();

    return NextResponse.json<AccessAutomationApiResponse>({
      data: mapConfigToFormValues(config),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load access automation settings.";
    return NextResponse.json<AccessAutomationApiResponse>(
      {
        data: null,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  let body: UpdateAccessAutomationSettingsBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AccessAutomationApiResponse>(
      {
        data: null,
        error: "Invalid JSON payload.",
      },
      { status: 400 }
    );
  }

  const validationError = validatePayload(body);
  if (validationError) {
    return NextResponse.json<AccessAutomationApiResponse>(
      {
        data: null,
        error: validationError,
      },
      { status: 400 }
    );
  }

  try {
    await accessAutomationSettingsRepository.replaceRules(
      (body.rules as UpdateAccessAutomationRuleBody[]).map((rule, index) => ({
        rule_name: normalizeNullableString(rule.ruleName)!,
        target_org: normalizeNullableString(rule.targetOrg)!,
        target_team_slug: normalizeNullableString(rule.targetTeamSlug),
        target_team_id: normalizeTeamId(rule.targetTeamId),
        target_username: normalizeNullableString(rule.targetUsername)!,
        enable_grant_on_add: rule.enableGrantOnAdd as boolean,
        enable_revoke_on_remove: rule.enableRevokeOnRemove as boolean,
        enable_revoke_on_team_member_remove: rule.enableRevokeOnTeamMemberRemove as boolean,
        dry_run: rule.dryRun as boolean,
        repository_allowlist: normalizeNullableString(rule.repositoryAllowlist),
        repository_denylist: normalizeNullableString(rule.repositoryDenylist),
        order_index: index,
      }))
    );

    const config = await getAccessAutomationConfig();

    return NextResponse.json<AccessAutomationApiResponse>({
      data: mapConfigToFormValues(config),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save access automation settings.";
    return NextResponse.json<AccessAutomationApiResponse>(
      {
        data: null,
        error: message,
      },
      { status: 500 }
    );
  }
}