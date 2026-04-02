/**
 * Repository for webhook event database operations.
 * Encapsulates all database queries related to webhook events.
 */
import { query } from "@/lib/db";
import type { WebhookEventEntity, CreateWebhookEventEntity } from "@/lib/entities/webhook-event";

export interface WebhookProcessingOutcome {
    summary: string;
    details?: Record<string, unknown> | null;
}

/**
 * Create a new webhook event record.
 */
export async function create(entity: CreateWebhookEventEntity): Promise<WebhookEventEntity> {
    const results = await query<WebhookEventEntity>(
        `INSERT INTO webhook_events (delivery_id, event_type, action, payload, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [
            entity.delivery_id,
            entity.event_type,
            entity.action || null,
            JSON.stringify(entity.payload),
        ]
    );
    return results[0];
}

/**
 * Find webhook event by delivery ID (for idempotency checks).
 */
export async function findByDeliveryId(deliveryId: string): Promise<WebhookEventEntity | null> {
    const results = await query<WebhookEventEntity>(
        `SELECT * FROM webhook_events WHERE delivery_id = $1`,
        [deliveryId]
    );
    return results[0] || null;
}

/**
 * Get all pending webhook events for processing.
 */
export async function findPending(): Promise<WebhookEventEntity[]> {
    return query<WebhookEventEntity>(
        `SELECT * FROM webhook_events WHERE status = 'pending' ORDER BY created_at ASC`
    );
}

/**
 * Update webhook event status to processed.
 */
export async function markAsProcessed(id: number): Promise<void> {
    await query(
        `UPDATE webhook_events
         SET status = 'processed', processed_at = NOW()
         WHERE id = $1`,
        [id]
    );
}

export async function markAsProcessedWithOutcome(
    id: number,
    outcome: WebhookProcessingOutcome
): Promise<void> {
    await query(
        `UPDATE webhook_events
         SET status = 'processed',
             outcome_summary = $1,
             outcome_details = $2,
             error_message = NULL,
             processed_at = NOW()
         WHERE id = $3`,
        [outcome.summary, outcome.details ? JSON.stringify(outcome.details) : null, id]
    );
}

/**
 * Update webhook event status to failed with error message.
 */
export async function markAsFailed(id: number, errorMessage: string): Promise<void> {
    await query(
        `UPDATE webhook_events
         SET status = 'failed', error_message = $1, processed_at = NOW()
         WHERE id = $2`,
        [errorMessage, id]
    );
}

export async function markAsFailedWithOutcome(
    id: number,
    errorMessage: string,
    outcome?: WebhookProcessingOutcome
): Promise<void> {
    await query(
        `UPDATE webhook_events
         SET status = 'failed',
             error_message = $1,
             outcome_summary = $2,
             outcome_details = $3,
             processed_at = NOW()
         WHERE id = $4`,
        [
            errorMessage,
            outcome?.summary ?? 'Processing failed',
            outcome?.details ? JSON.stringify(outcome.details) : null,
            id,
        ]
    );
}

/**
 * Get recent webhook events for monitoring/debugging.
 */
export async function findRecent(limit: number = 50): Promise<WebhookEventEntity[]> {
    return query<WebhookEventEntity>(
        `SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT $1`,
        [limit]
    );
}

/**
 * Get failed webhook events for investigation.
 */
export async function findFailed(): Promise<WebhookEventEntity[]> {
    return query<WebhookEventEntity>(
        `SELECT * FROM webhook_events WHERE status = 'failed' ORDER BY created_at DESC`
    );
}

export interface FindAllOptions {
    status?: string;
    eventType?: string;
    action?: string;
    limit?: number;
    offset?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * Get all webhook events with filtering and pagination.
 */
export async function findAllPaginated(options: FindAllOptions = {}): Promise<PaginatedResult<WebhookEventEntity>> {
    const { status, eventType, action, limit = 20, offset = 0 } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
    }

    if (eventType && eventType !== 'all') {
        conditions.push(`event_type = $${paramIndex++}`);
        params.push(eventType);
    }

    if (action && action !== 'all') {
        conditions.push(`action = $${paramIndex++}`);
        params.push(action);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM webhook_events ${whereClause}`,
        params
    );
    const total = parseInt(countResult[0].count, 10);

    // Get paginated data
    const data = await query<WebhookEventEntity>(
        `SELECT * FROM webhook_events ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
    );

    return { data, total, limit, offset };
}
