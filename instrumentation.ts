/**
 * Next.js instrumentation hook.
 * Runs once when the server starts.
 * Used to initialize cron jobs for background processing.
 */
export async function register() {
    // Only run on server, not during build
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { processWebhookEvents } = await import('@/lib/services/webhook-processor');

        // Run every minute
        cron.schedule('* * * * *', async () => {
            console.log('[Cron] Processing pending webhook events...');
            try {
                await processWebhookEvents();
            } catch (error) {
                console.error('[Cron] Error processing webhook events:', error);
            }
        });

        console.log('[Cron] Webhook processor scheduled (runs every minute)');
    }
}
