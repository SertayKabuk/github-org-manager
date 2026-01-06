/**
 * Webhook event entity types for database operations.
 * These types represent the webhook_events table in the database.
 */

export type WebhookEventStatus = 'pending' | 'processed' | 'failed';

/**
 * Webhook event entity as stored in the database.
 */
export interface WebhookEventEntity {
    id: number;
    delivery_id: string;
    event_type: string;
    action: string | null;
    payload: Record<string, unknown>;
    status: WebhookEventStatus;
    error_message: string | null;
    processed_at: Date | null;
    created_at: Date;
}

/**
 * Data required to create a new webhook event.
 */
export interface CreateWebhookEventEntity {
    delivery_id: string;
    event_type: string;
    action?: string | null;
    payload: Record<string, unknown>;
}
