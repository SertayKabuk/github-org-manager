/**
 * Service for processing webhook events.
 * Handles business logic for organization member events and repo access automation.
 */
import * as webhookEventRepo from "@/lib/repositories/webhook-event-repository";
import * as invitationRepo from "@/lib/repositories/invitation-repository";
import {
    type AccessAutomationRule,
    getAccessAutomationConfig,
    isRuleEnabled,
    isRepositoryAllowed,
    matchesTargetTeam,
} from "@/lib/config/access-automation-config";
import { addUserToDefaultCostCenter } from "@/lib/services/cost-center-service";
import {
    grantDirectAdmin,
    revokeDirectAccess,
    revokeDirectAccessForTeamRepositories,
} from "@/lib/services/team-repo-access-service";
import type { WebhookEventEntity } from "@/lib/entities/webhook-event";
import type { WebhookProcessingOutcome } from "@/lib/repositories/webhook-event-repository";

/**
 * Webhook payload types for organization member events.
 */
interface OrganizationMemberPayload {
    action: "member_added" | "member_removed" | "member_invited";
    membership: {
        role: string;
        state: string;
        user: {
            login: string;
            id: number;
            avatar_url: string;
            type: string;
        };
    };
    organization: {
        login: string;
        id: number;
    };
    sender: {
        login: string;
        id: number;
    };
    invitation?: {
        id: number;
        email: string;
        login?: string;
        role: string;
        created_at: string;
        inviter?: {
            login: string;
            id: number;
        };
    };
}

interface OrganizationRef {
    login: string;
    id?: number;
}

interface InstallationRef {
    id: number;
}

interface TeamRef {
    id: number;
    slug: string;
}

interface RepositoryRef {
    name: string;
    full_name: string;
    owner: {
        login: string;
    };
}

interface TeamRepositoryPayload {
    organization?: OrganizationRef;
    installation?: InstallationRef;
    team?: TeamRef;
    repository?: RepositoryRef;
}

interface MembershipPayload {
    organization?: OrganizationRef;
    installation?: InstallationRef;
    team?: TeamRef;
    member?: {
        login: string;
    };
}

interface NormalizedTeamRepositoryEvent {
    action: "linked" | "unlinked";
    eventName: string;
    sourceAction: string | null;
    organization: string;
    teamId: number | null;
    teamSlug: string | null;
    repoOwner: string;
    repoName: string;
    repoFullName: string;
    installationId: number | null;
}

export interface ProcessingResult {
    processed: number;
    failed: number;
    errors: string[];
}

/**
 * Process all pending webhook events.
 * Called by cron job or manual trigger.
 */
export async function processWebhookEvents(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
        processed: 0,
        failed: 0,
        errors: [],
    };

    const pendingEvents = await webhookEventRepo.findPending();

    for (const event of pendingEvents) {
        try {
            const outcome = await processSingleEvent(event);
            await webhookEventRepo.markAsProcessedWithOutcome(event.id, outcome);
            result.processed++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await webhookEventRepo.markAsFailedWithOutcome(event.id, errorMessage);
            result.failed++;
            result.errors.push(`Event ${event.id}: ${errorMessage}`);
            console.error(`Failed to process webhook event ${event.id}:`, errorMessage);
        }
    }

    if (pendingEvents.length > 0) {
        console.log(`[WebhookProcessor] Processed ${result.processed}, failed ${result.failed}`);
    }

    return result;
}

/**
 * Process a single webhook event based on its type and action.
 */
async function processSingleEvent(event: WebhookEventEntity): Promise<WebhookProcessingOutcome> {
    switch (event.event_type) {
        case "organization": {
            const payload = event.payload as unknown as OrganizationMemberPayload;

            switch (payload.action) {
                case "member_added":
                    return handleMemberAdded(payload);
                case "member_invited":
                    return handleMemberInvited(payload);
                case "member_removed":
                    console.log(`Member removed: ${payload.membership?.user?.login}`);
                    return {
                        summary: `Organization member removed: ${payload.membership?.user?.login ?? 'unknown user'}`,
                        details: {
                            githubUsername: payload.membership?.user?.login ?? null,
                            action: payload.action,
                        },
                    };
            }
            return {
                summary: `Organization event ignored: ${payload.action}`,
                details: {
                    action: payload.action,
                },
            };
        }
        case "team":
        case "team_add":
            return handleTeamRepositoryAccessEvent(event);
        case "membership":
            return handleMembershipEvent(event);
        default:
            return {
                summary: `No processor configured for event type ${event.event_type}`,
                details: {
                    eventType: event.event_type,
                    action: event.action,
                },
            };
    }
}

function normalizeOptionalLogin(value: string | undefined | null): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
}

function normalizeTeamRepositoryEvent(
    event: WebhookEventEntity
): NormalizedTeamRepositoryEvent | null {
    const payload = event.payload as unknown as TeamRepositoryPayload;

    if (!payload.team || !payload.repository) {
        return null;
    }

    const organization =
        normalizeOptionalLogin(payload.organization?.login) ||
        normalizeOptionalLogin(payload.repository.owner?.login);

    if (!organization) {
        return null;
    }

    if (event.event_type === "team" && event.action === "added_to_repository") {
        return {
            action: "linked",
            eventName: event.event_type,
            sourceAction: event.action,
            organization,
            teamId: payload.team.id ?? null,
            teamSlug: payload.team.slug?.toLowerCase() ?? null,
            repoOwner: payload.repository.owner.login,
            repoName: payload.repository.name,
            repoFullName: payload.repository.full_name,
            installationId: payload.installation?.id ?? null,
        };
    }

    if (event.event_type === "team" && event.action === "removed_from_repository") {
        return {
            action: "unlinked",
            eventName: event.event_type,
            sourceAction: event.action,
            organization,
            teamId: payload.team.id ?? null,
            teamSlug: payload.team.slug?.toLowerCase() ?? null,
            repoOwner: payload.repository.owner.login,
            repoName: payload.repository.name,
            repoFullName: payload.repository.full_name,
            installationId: payload.installation?.id ?? null,
        };
    }

    if (event.event_type === "team_add") {
        return {
            action: "linked",
            eventName: event.event_type,
            sourceAction: event.action,
            organization,
            teamId: payload.team.id ?? null,
            teamSlug: payload.team.slug?.toLowerCase() ?? null,
            repoOwner: payload.repository.owner.login,
            repoName: payload.repository.name,
            repoFullName: payload.repository.full_name,
            installationId: payload.installation?.id ?? null,
        };
    }

    return null;
}

async function handleTeamRepositoryAccessEvent(event: WebhookEventEntity): Promise<WebhookProcessingOutcome> {
    const config = await getAccessAutomationConfig();

    if (config.rules.length === 0) {
        return {
            summary: "No access automation rules are configured",
            details: {
                eventType: event.event_type,
                action: event.action,
            },
        };
    }

    const normalized = normalizeTeamRepositoryEvent(event);

    if (!normalized) {
        return {
            summary: "Webhook payload did not contain the expected team/repository fields",
            details: {
                eventType: event.event_type,
                action: event.action,
            },
        };
    }

    const matchingRules = config.rules.filter(
        (rule) =>
            isRuleEnabled(rule) &&
            normalized.organization === rule.targetOrg &&
            matchesTargetTeam(rule, normalized.teamId, normalized.teamSlug)
    );

    if (matchingRules.length === 0) {
        return {
            summary: "No matching rule found for this event",
            details: {
                organization: normalized.organization,
                teamId: normalized.teamId,
                teamSlug: normalized.teamSlug,
                repository: normalized.repoFullName,
            },
        };
    }
    const ruleResults: Record<string, unknown>[] = [];

    for (const rule of matchingRules) {
        ruleResults.push(
            await evaluateTeamRepositoryRule(rule, event, normalized)
        );
    }

    const executedCount = ruleResults.filter((result) => result.resultType === "executed").length;

    return {
        summary:
            executedCount > 0
                ? `Evaluated ${matchingRules.length} matching rule${matchingRules.length === 1 ? "" : "s"}; ${executedCount} executed action${executedCount === 1 ? "" : "s"}`
                : `Evaluated ${matchingRules.length} matching rule${matchingRules.length === 1 ? "" : "s"}; no actions executed`,
        details: {
            repository: normalized.repoFullName,
            organization: normalized.organization,
            teamId: normalized.teamId,
            teamSlug: normalized.teamSlug,
            results: ruleResults,
        },
    };
}

async function handleMembershipEvent(event: WebhookEventEntity): Promise<WebhookProcessingOutcome> {
    const config = await getAccessAutomationConfig();

    if (config.rules.length === 0) {
        return {
            summary: "No access automation rules are configured",
            details: {
                eventType: event.event_type,
                action: event.action,
            },
        };
    }

    if (event.action !== "removed") {
        return {
            summary: `Ignored membership action ${event.action ?? 'unknown'}`,
            details: {
                action: event.action,
            },
        };
    }

    const payload = event.payload as unknown as MembershipPayload;
    const organization = normalizeOptionalLogin(payload.organization?.login);
    const teamSlug = payload.team?.slug?.toLowerCase() ?? null;
    const teamId = payload.team?.id ?? null;
    const memberLogin = payload.member?.login?.toLowerCase() ?? null;

    if (!organization) {
        return {
            summary: "Ignored membership event because organization login was missing",
            details: {
                organization,
            },
        };
    }

    if (!memberLogin) {
        return {
            summary: "Ignored membership event because member login was missing",
            details: {
                memberLogin,
            },
        };
    }

    if (!teamSlug) {
        console.warn("[TeamRepoAccess] Membership revoke skipped because team slug is missing", {
            deliveryId: event.delivery_id,
            teamId,
        });
        return {
            summary: "Membership revoke skipped because team slug is missing",
            details: {
                teamId,
            },
        };
    }

    const matchingRules = config.rules.filter(
        (rule) =>
            isRuleEnabled(rule) &&
            rule.enableRevokeOnTeamMemberRemove &&
            rule.targetOrg === organization &&
            rule.targetUsername === memberLogin &&
            matchesTargetTeam(rule, teamId, teamSlug)
    );

    if (matchingRules.length === 0) {
        return {
            summary: "No matching rule found for this membership removal",
            details: {
                organization,
                teamId,
                teamSlug,
                memberLogin,
            },
        };
    }

    const ruleResults: Record<string, unknown>[] = [];

    for (const rule of matchingRules) {
        const results = await revokeDirectAccessForTeamRepositories({
            org: organization,
            teamSlug,
            username: rule.targetUsername!,
            dryRun: rule.dryRun,
            deliveryId: event.delivery_id,
            eventName: event.event_type,
            eventAction: event.action,
            installationId: payload.installation?.id ?? null,
        });

        console.log("[TeamRepoAccess] Processed membership removal revoke sweep", {
            deliveryId: event.delivery_id,
            organization,
            teamSlug,
            targetUsername: rule.targetUsername,
            affectedRepositories: results.length,
            dryRun: rule.dryRun,
            ruleId: rule.id,
            ruleName: rule.ruleName,
        });

        ruleResults.push({
            ruleId: rule.id,
            ruleName: rule.ruleName,
            targetUsername: rule.targetUsername,
            dryRun: rule.dryRun,
            affectedRepositories: results.length,
            results,
            resultType: "executed",
        });
    }

    return {
        summary: `Processed membership removal for ${matchingRules.length} matching rule${matchingRules.length === 1 ? "" : "s"}`,
        details: {
            organization,
            teamSlug,
            memberLogin,
            results: ruleResults,
        },
    };
}

async function evaluateTeamRepositoryRule(
    rule: AccessAutomationRule,
    event: WebhookEventEntity,
    normalized: NormalizedTeamRepositoryEvent
): Promise<Record<string, unknown>> {
    const baseDetails = {
        ruleId: rule.id,
        ruleName: rule.ruleName,
        targetUsername: rule.targetUsername,
        repository: normalized.repoFullName,
        dryRun: rule.dryRun,
    };

    if (!isRepositoryAllowed(rule, normalized.repoFullName)) {
        return {
            ...baseDetails,
            resultType: "skipped",
            summary: "Ignored repository due to allowlist/denylist rules",
        };
    }

    if (normalized.action === "linked") {
        if (!rule.enableGrantOnAdd) {
            return {
                ...baseDetails,
                resultType: "skipped",
                summary: "Grant on add is disabled for this rule",
            };
        }

        const grantResult = await grantDirectAdmin({
            owner: normalized.repoOwner,
            repo: normalized.repoName,
            fullName: normalized.repoFullName,
            username: rule.targetUsername!,
            dryRun: rule.dryRun,
            installationId: normalized.installationId,
            eventName: normalized.eventName,
            eventAction: normalized.sourceAction,
            deliveryId: event.delivery_id,
        });

        return {
            ...baseDetails,
            resultType: "executed",
            summary: grantResult.message,
            outcome: grantResult.outcome,
            status: grantResult.status ?? null,
            existingPermission: grantResult.existingPermission ?? null,
            invitationCreated: grantResult.invitationCreated ?? false,
        };
    }

    if (!rule.enableRevokeOnRemove) {
        return {
            ...baseDetails,
            resultType: "skipped",
            summary: "Revoke on remove is disabled for this rule",
        };
    }

    const revokeResult = await revokeDirectAccess({
        owner: normalized.repoOwner,
        repo: normalized.repoName,
        fullName: normalized.repoFullName,
        username: rule.targetUsername!,
        dryRun: rule.dryRun,
        installationId: normalized.installationId,
        eventName: normalized.eventName,
        eventAction: normalized.sourceAction,
        deliveryId: event.delivery_id,
    });

    return {
        ...baseDetails,
        resultType: "executed",
        summary: revokeResult.message,
        outcome: revokeResult.outcome,
        status: revokeResult.status ?? null,
        existingPermission: revokeResult.existingPermission ?? null,
    };
}

/**
 * Handle member_added event:
 * 1. Update invitation record with GitHub username
 * 2. Add user to default cost center
 */
async function handleMemberAdded(payload: OrganizationMemberPayload): Promise<WebhookProcessingOutcome> {
    const { membership, invitation } = payload;
    const githubUsername = membership.user.login;
    const githubUserId = membership.user.id;

    // Update invitation record
    let matchedInvitation = false;

    if (invitation?.id) {
        const result = await invitationRepo.updateWithGitHubUser(
            invitation.id,
            githubUsername,
            githubUserId
        );
        if (result) {
            console.log(`Matched invitation by ID: ${invitation.id} -> ${githubUsername}`);
            matchedInvitation = true;
        }
    }

    if (!matchedInvitation && invitation?.email) {
        const result = await invitationRepo.updateByEmailWithGitHubUser(
            invitation.email,
            githubUsername,
            githubUserId
        );
        if (result) {
            console.log(`Matched invitation by email: ${invitation.email} -> ${githubUsername}`);
            matchedInvitation = true;
        }
    }

    if (!matchedInvitation) {
        console.log(`No matching pending invitation found for ${githubUsername}`);
    }

    // Add user to default cost center
    const costCenterResult = await addUserToDefaultCostCenter(githubUsername);
    if (costCenterResult.success) {
        console.log(`Added ${githubUsername} to cost center ${costCenterResult.costCenterId}`);
    } else {
        console.log(`Cost center assignment skipped/failed for ${githubUsername}: ${costCenterResult.message}`);
    }

    return {
        summary: `Processed organization member_added for ${githubUsername}`,
        details: {
            githubUsername,
            githubUserId,
            invitationId: invitation?.id ?? null,
            matchedInvitation,
            costCenterResult,
        },
    };
}

/**
 * Handle member_invited event:
 * Store invitation if not already tracked
 */
async function handleMemberInvited(payload: OrganizationMemberPayload): Promise<WebhookProcessingOutcome> {
    const { invitation } = payload;
    if (!invitation) {
        return {
            summary: "Organization member_invited event missing invitation payload",
            details: null,
        };
    }

    const existing = await invitationRepo.findByGitHubInvitationId(invitation.id);
    let stored = false;

    if (!existing && invitation.email) {
        await invitationRepo.create({
            email: invitation.email,
            status: 'pending',
            github_invitation_id: invitation.id,
            role: invitation.role || "direct_member",
            inviter_login: invitation.inviter?.login || null,
            inviter_id: invitation.inviter?.id || null,
            invited_at: invitation.created_at,
        });
        console.log(`Stored external invitation: ${invitation.email}`);
        stored = true;
    }

    return {
        summary: stored
            ? `Stored invitation for ${invitation.email}`
            : `Invitation already existed or could not be stored for ${invitation.email ?? 'unknown email'}`,
        details: {
            invitationId: invitation.id,
            email: invitation.email,
            stored,
            existing: Boolean(existing),
        },
    };
}
