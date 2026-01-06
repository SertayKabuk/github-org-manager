/**
 * Webhook processor endpoint.
 * Manually triggers processing of pending webhook events.
 * Can be called via cron job or manual trigger.
 */
import { NextResponse } from "next/server";
import { processWebhookEvents } from "@/lib/services/webhook-processor";
import type { ApiResponse } from "@/lib/types/github";

interface ProcessResponse {
    processed: number;
    failed: number;
    errors: string[];
}

/**
 * POST /api/webhooks/github/process
 * Process all pending webhook events.
 */
export async function POST() {
    try {
        const result = await processWebhookEvents();

        return NextResponse.json<ApiResponse<ProcessResponse>>({
            data: {
                processed: result.processed,
                failed: result.failed,
                errors: result.errors,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Webhook processing failed:", message);

        return NextResponse.json<ApiResponse<ProcessResponse>>(
            {
                data: { processed: 0, failed: 0, errors: [] },
                error: message,
            },
            { status: 500 }
        );
    }
}
