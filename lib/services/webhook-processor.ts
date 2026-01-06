/**
 * Service for processing webhook events.
 * Handles business logic for organization member events.
 */
import * as webhookEventRepo from "@/lib/repositories/webhook-event-repository";
import * as invitationRepo from "@/lib/repositories/invitation-repository";
import { addUserToDefaultCostCenter } from "@/lib/services/cost-center-service";
import type { WebhookEventEntity } from "@/lib/entities/webhook-event";

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
            await processSingleEvent(event);
            await webhookEventRepo.markAsProcessed(event.id);
            result.processed++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await webhookEventRepo.markAsFailed(event.id, errorMessage);
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
async function processSingleEvent(event: WebhookEventEntity): Promise<void> {
    // Only process organization events
    if (event.event_type !== "organization") {
        return;
    }

    const payload = event.payload as unknown as OrganizationMemberPayload;

    switch (payload.action) {
        case "member_added":
            await handleMemberAdded(payload);
            break;
        case "member_invited":
            await handleMemberInvited(payload);
            break;
        case "member_removed":
            // Currently just log, no action needed
            console.log(`Member removed: ${payload.membership?.user?.login}`);
            break;
    }
}

/**
 * Handle member_added event:
 * 1. Update invitation record with GitHub username
 * 2. Add user to default cost center
 */
async function handleMemberAdded(payload: OrganizationMemberPayload): Promise<void> {
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
}

/**
 * Handle member_invited event:
 * Store invitation if not already tracked
 */
async function handleMemberInvited(payload: OrganizationMemberPayload): Promise<void> {
    const { invitation } = payload;
    if (!invitation) return;

    const existing = await invitationRepo.findByGitHubInvitationId(invitation.id);

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
    }
}
