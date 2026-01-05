/**
 * Repository for invitation database operations.
 * Encapsulates all database queries related to invitations.
 */
import { query } from "@/lib/db";
import type { InvitationEntity, InvitationStatus, CreateInvitationEntity } from "@/lib/entities/invitation";

/**
 * Get all invitations, optionally filtered by status.
 */
export async function findAll(status?: string): Promise<InvitationEntity[]> {
    if (status && status !== "all") {
        return query<InvitationEntity>(
            "SELECT * FROM invitations WHERE status = $1 ORDER BY created_at DESC",
            [status]
        );
    }
    return query<InvitationEntity>("SELECT * FROM invitations ORDER BY created_at DESC");
}

/**
 * Get all pending invitations.
 */
export async function findPending(): Promise<InvitationEntity[]> {
    return query<InvitationEntity>("SELECT * FROM invitations WHERE status = 'pending'");
}

/**
 * Find invitation by GitHub invitation ID.
 */
export async function findByGitHubInvitationId(githubInvitationId: number): Promise<InvitationEntity | null> {
    const results = await query<InvitationEntity>(
        "SELECT * FROM invitations WHERE github_invitation_id = $1",
        [githubInvitationId]
    );
    return results[0] || null;
}

/**
 * Get all existing GitHub invitation IDs in the database.
 */
export async function getAllGitHubInvitationIds(): Promise<Set<number>> {
    const results = await query<{ github_invitation_id: number }>(
        "SELECT github_invitation_id FROM invitations WHERE github_invitation_id IS NOT NULL"
    );
    return new Set(results.map((row) => row.github_invitation_id));
}

/**
 * Create a new invitation.
 */
export async function create(entity: CreateInvitationEntity): Promise<InvitationEntity> {
    const results = await query<InvitationEntity>(
        `INSERT INTO invitations (
            email, status, github_invitation_id, role, team_ids,
            inviter_login, inviter_id, invited_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamp, NOW()), COALESCE($8::timestamp, NOW()) + INTERVAL '7 days')
        RETURNING *`,
        [
            entity.email,
            entity.status,
            entity.github_invitation_id,
            entity.role,
            entity.team_ids || null,
            entity.inviter_login || null,
            entity.inviter_id || null,
            entity.invited_at || null,
        ]
    );
    return results[0];
}

/**
 * Update invitation status.
 */
export async function updateStatus(id: number, status: InvitationStatus): Promise<void> {
    await query("UPDATE invitations SET status = $1 WHERE id = $2", [status, id]);
}

/**
 * Mark invitation as accepted with timestamp.
 */
export async function markAsAccepted(id: number): Promise<void> {
    await query(
        "UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1",
        [id]
    );
}

/**
 * Mark all expired pending invitations.
 */
export async function markExpired(): Promise<void> {
    await query(
        "UPDATE invitations SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW()"
    );
}

/**
 * Update invitation with GitHub user info when accepted via webhook.
 */
export async function updateWithGitHubUser(
    githubInvitationId: number,
    githubUsername: string,
    githubUserId: number
): Promise<InvitationEntity | null> {
    const results = await query<InvitationEntity>(
        `UPDATE invitations 
         SET github_username = $1, github_user_id = $2, status = 'accepted', accepted_at = NOW()
         WHERE github_invitation_id = $3 AND status = 'pending'
         RETURNING *`,
        [githubUsername, githubUserId, githubInvitationId]
    );
    return results[0] || null;
}

/**
 * Update invitation by email with GitHub user info when accepted.
 */
export async function updateByEmailWithGitHubUser(
    email: string,
    githubUsername: string,
    githubUserId: number
): Promise<InvitationEntity | null> {
    const results = await query<InvitationEntity>(
        `UPDATE invitations 
         SET github_username = $1, github_user_id = $2, status = 'accepted', accepted_at = NOW()
         WHERE email = $3 AND status = 'pending'
         RETURNING *`,
        [githubUsername, githubUserId, email]
    );
    return results[0] || null;
}
