/**
 * API route for syncing invitations with GitHub.
 * POST - Fetch pending/failed invitations from GitHub and sync with database
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/helpers";
import { getAuthenticatedOctokit, getOrgName } from "@/lib/octokit";
import * as invitationRepo from "@/lib/repositories/invitation-repository";
import type { ApiResponse } from "@/lib/types/github";

interface SyncResult {
    pendingInGitHub: number;
    failedInGitHub: number;
    markedAsAccepted: number;
    markedAsFailed: number;
    newFromGitHub: number;
}

/**
 * POST /api/invitations/sync
 * Sync pending and failed invitations from GitHub with the database
 */
export async function POST() {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const octokit = await getAuthenticatedOctokit();
        const org = getOrgName();

        // Fetch pending invitations from GitHub
        const pendingInvitations = await octokit.paginate(
            octokit.rest.orgs.listPendingInvitations,
            { org, per_page: 100 }
        );

        // Fetch failed invitations from GitHub
        const failedInvitations = await octokit.paginate(
            octokit.rest.orgs.listFailedInvitations,
            { org, per_page: 100 }
        );

        // Create sets of GitHub invitation IDs for quick lookup
        const pendingIds = new Set(pendingInvitations.map((inv) => inv.id));
        const failedIds = new Set(failedInvitations.map((inv) => inv.id));

        // Get all pending invitations from our database
        const dbPendingInvitations = await invitationRepo.findPending();

        // Get existing GitHub invitation IDs from DB
        const existingGitHubIds = await invitationRepo.getAllGitHubInvitationIds();

        let markedAsAccepted = 0;
        let markedAsFailed = 0;
        let newFromGitHub = 0;

        // Update existing pending invitations in DB
        for (const dbInv of dbPendingInvitations) {
            if (!dbInv.github_invitation_id) {
                continue;
            }

            if (pendingIds.has(dbInv.github_invitation_id)) {
                continue;
            }

            if (failedIds.has(dbInv.github_invitation_id)) {
                await invitationRepo.updateStatus(dbInv.id, 'failed');
                markedAsFailed++;
            } else {
                await invitationRepo.markAsAccepted(dbInv.id);
                markedAsAccepted++;
            }
        }

        // Insert pending invitations from GitHub that don't exist in DB
        for (const githubInv of pendingInvitations) {
            if (existingGitHubIds.has(githubInv.id)) {
                continue;
            }

            await invitationRepo.create({
                email: githubInv.email || '',
                status: 'pending',
                github_invitation_id: githubInv.id,
                role: githubInv.role || 'direct_member',
                inviter_login: githubInv.inviter?.login || null,
                inviter_id: githubInv.inviter?.id || null,
                invited_at: githubInv.created_at,
            });
            newFromGitHub++;
        }

        // Insert failed invitations from GitHub that don't exist in DB
        for (const githubInv of failedInvitations) {
            if (existingGitHubIds.has(githubInv.id)) {
                continue;
            }

            await invitationRepo.create({
                email: githubInv.email || '',
                status: 'failed',
                github_invitation_id: githubInv.id,
                role: githubInv.role || 'direct_member',
                inviter_login: githubInv.inviter?.login || null,
                inviter_id: githubInv.inviter?.id || null,
                invited_at: githubInv.created_at,
            });
            newFromGitHub++;
        }

        const result: SyncResult = {
            pendingInGitHub: pendingInvitations.length,
            failedInGitHub: failedInvitations.length,
            markedAsAccepted,
            markedAsFailed,
            newFromGitHub,
        };

        return NextResponse.json<ApiResponse<SyncResult>>({ data: result });
    } catch (error) {
        console.error("Error syncing invitations:", error);
        const message = error instanceof Error ? error.message : "Failed to sync invitations";
        return NextResponse.json<ApiResponse<SyncResult>>(
            { data: { pendingInGitHub: 0, failedInGitHub: 0, markedAsAccepted: 0, markedAsFailed: 0, newFromGitHub: 0 }, error: message },
            { status: 500 }
        );
    }
}
