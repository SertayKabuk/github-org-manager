/**
 * Email mapping entity types for database operations.
 * These types represent the email_mappings table in the database.
 */

/**
 * Email mapping entity as stored in the database.
 */
export interface EmailMappingEntity {
    id: number;
    github_username: string;
    github_user_id: number;
    email: string;
    is_primary: boolean;
    created_at: Date;
}

/**
 * Data required to create a new email mapping.
 */
export interface CreateEmailMappingEntity {
    github_username: string;
    github_user_id: number;
    email: string;
    is_primary?: boolean;
}
