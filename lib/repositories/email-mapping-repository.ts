/**
 * Repository for email mapping database operations.
 * Encapsulates all database queries related to email mappings.
 */
import { query } from "@/lib/db";
import type { EmailMappingEntity, CreateEmailMappingEntity } from "@/lib/entities/email-mapping";

/**
 * Get all email mappings.
 */
export async function findAll(): Promise<EmailMappingEntity[]> {
    return query<EmailMappingEntity>("SELECT * FROM email_mappings ORDER BY created_at DESC");
}

/**
 * Find email mappings by email address.
 */
export async function findByEmail(email: string): Promise<EmailMappingEntity[]> {
    return query<EmailMappingEntity>(
        "SELECT * FROM email_mappings WHERE email ILIKE $1 ORDER BY created_at DESC",
        [email]
    );
}

/**
 * Find email mappings by GitHub username.
 */
export async function findByUsername(username: string): Promise<EmailMappingEntity[]> {
    return query<EmailMappingEntity>(
        "SELECT * FROM email_mappings WHERE github_username ILIKE $1 ORDER BY created_at DESC",
        [username]
    );
}

/**
 * Find email mappings by GitHub user ID.
 */
export async function findByGitHubUserId(githubUserId: number): Promise<EmailMappingEntity[]> {
    return query<EmailMappingEntity>(
        "SELECT * FROM email_mappings WHERE github_user_id = $1 ORDER BY created_at DESC",
        [githubUserId]
    );
}

/**
 * Create a new email mapping (or ignore if already exists).
 */
export async function upsert(entity: CreateEmailMappingEntity): Promise<EmailMappingEntity> {
    const results = await query<EmailMappingEntity>(
        `INSERT INTO email_mappings (github_username, github_user_id, email, is_primary)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (github_user_id, email) 
         DO UPDATE SET github_username = $1, is_primary = $4
         RETURNING *`,
        [entity.github_username, entity.github_user_id, entity.email, entity.is_primary ?? false]
    );
    return results[0];
}

/**
 * Create multiple email mappings for a user (upsert each).
 */
export async function upsertMany(entities: CreateEmailMappingEntity[]): Promise<EmailMappingEntity[]> {
    const results: EmailMappingEntity[] = [];
    for (const entity of entities) {
        const result = await upsert(entity);
        results.push(result);
    }
    return results;
}

/**
 * Search email mappings by email or username.
 */
export async function search(searchTerm: string): Promise<EmailMappingEntity[]> {
    return query<EmailMappingEntity>(
        `SELECT * FROM email_mappings 
         WHERE email ILIKE $1 OR github_username ILIKE $1 
         ORDER BY created_at DESC`,
        [`%${searchTerm}%`]
    );
}

/**
 * Get count of all email mappings.
 */
export async function count(): Promise<number> {
    const results = await query<{ count: string }>("SELECT COUNT(*) as count FROM email_mappings");
    return parseInt(results[0].count, 10);
}
