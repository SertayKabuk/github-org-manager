/**
 * GitHub Webhook handler for organization member events.
 * This endpoint stores webhooks to the database and returns immediately.
 * Events are processed asynchronously by the webhook processor service.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import * as webhookEventRepo from "@/lib/repositories/webhook-event-repository";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse } from "@/lib/types/github";
import type { WebhookEventEntity } from "@/lib/entities/webhook-event";

interface PaginatedWebhookResponse {
    events: WebhookEventEntity[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * GET /api/webhooks/github
 * List webhook events with filtering and pagination (requires auth)
 */
export async function GET(request: NextRequest) {
    const authError = await requireAuth();
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || undefined;
    const eventType = searchParams.get("eventType") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    try {
        const result = await webhookEventRepo.findAllPaginated({
            status,
            eventType,
            action,
            limit: Math.min(limit, 100), // Cap at 100
            offset,
        });

        return NextResponse.json<ApiResponse<PaginatedWebhookResponse>>({
            data: {
                events: result.data,
                total: result.total,
                limit: result.limit,
                offset: result.offset,
            },
        });
    } catch (error) {
        console.error("Error fetching webhook events:", error);
        return NextResponse.json<ApiResponse<PaginatedWebhookResponse>>(
            {
                data: { events: [], total: 0, limit, offset },
                error: "Failed to fetch webhook events",
            },
            { status: 500 }
        );
    }
}

/**
 * Verify GitHub webhook signature
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;

    const expectedSignature = `sha256=${createHmac("sha256", secret)
        .update(payload)
        .digest("hex")}`;

    try {
        return timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

/**
 * POST /api/webhooks/github
 * Store GitHub webhook events to database for async processing.
 * Returns 200 immediately after storing - does NOT process the event.
 */
export async function POST(request: NextRequest) {
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("WEBHOOK_SECRET environment variable is not set");
        return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    // Get the raw payload for signature verification
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256") || "";
    const event = request.headers.get("x-github-event") || "";
    const deliveryId = request.headers.get("x-github-delivery") || "";

    // Verify webhook signature
    if (!verifySignature(payload, signature, webhookSecret)) {
        console.error("Invalid webhook signature", { deliveryId });
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    let data: Record<string, unknown>;
    try {
        data = JSON.parse(payload);
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const action = typeof data.action === "string" ? data.action : null;

    console.log(`Received webhook: ${event}.${action}`, { deliveryId });

    // Check for duplicate delivery (idempotency)
    try {
        const existing = await webhookEventRepo.findByDeliveryId(deliveryId);
        if (existing) {
            console.log(`Duplicate webhook delivery ignored: ${deliveryId}`);
            return NextResponse.json({ message: "Duplicate delivery ignored" }, { status: 200 });
        }
    } catch (error) {
        console.error("Error checking for duplicate delivery:", error);
        // Continue - better to potentially duplicate than lose the event
    }

    // Store webhook event to database
    try {
        const webhookEvent = await webhookEventRepo.create({
            delivery_id: deliveryId,
            event_type: event,
            action,
            payload: data,
        });
        console.log(`Stored webhook event: ${webhookEvent.id}`);
    } catch (error) {
        console.error("Failed to store webhook event:", error);
        // Return 500 so GitHub can retry
        return NextResponse.json({ error: "Failed to store event" }, { status: 500 });
    }

    // Return 200 immediately - processing happens asynchronously
    return NextResponse.json({ message: "Event queued" }, { status: 200 });
}
