/**
 * Invitation entity types for database operations.
 * These types represent the invitations table in the database.
 */

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'failed';

/**
 * Invitation entity as stored in the database.
 */
export interface InvitationEntity {
    id: number;
    email: string;
    github_username: string | null;
    github_user_id: number | null;
    status: InvitationStatus;
    github_invitation_id: number | null;
    role: string;
    team_ids: number[] | null;
    inviter_login: string | null;
    inviter_id: number | null;
    invited_at: Date;
    expires_at: Date;
    accepted_at: Date | null;
    created_at: Date;
}

/**
 * Data required to create a new invitation.
 */
export interface CreateInvitationEntity {
    email: string;
    status: InvitationStatus;
    github_invitation_id: number | null;
    role: string;
    team_ids?: number[] | null;
    inviter_login?: string | null;
    inviter_id?: number | null;
    invited_at?: Date | string;
}
