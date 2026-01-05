/**
 * GitHub Webhook handler for organization member events.
 * This endpoint receives webhooks from GitHub and updates invitation records
 * when users accept invitations to match GitHub username with company email.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { query } from "@/lib/db";
import type { Invitation } from "@/lib/types/github";

// Webhook event types
interface OrganizationMemberPayload {
    action: "member_added" | "member_removed" | "member_invited";
    membership: {
        role: string;
        state: string;
        user: {
            login: string;
            id: number;
            avatar_url: string;
            type: string;
        };
    };
    organization: {
        login: string;
        id: number;
    };
    sender: {
        login: string;
        id: number;
    };
    invitation?: {
        id: number;
        email: string;
        login?: string;
        role: string;
        created_at: string;
        inviter?: {
            login: string;
            id: number;
        };
    };
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
 * Handle GitHub organization member webhooks
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
    let data: OrganizationMemberPayload;
    try {
        data = JSON.parse(payload);
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    console.log(`Received webhook: ${event}.${data.action}`, { deliveryId });

    // Only process organization member events
    if (event !== "organization") {
        return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    // Handle member_added action - this is when the invitation is accepted
    if (data.action === "member_added") {
        const { membership, invitation } = data;
        const githubUsername = membership.user.login;
        const githubUserId = membership.user.id;

        try {
            // Try to match by invitation ID first (most reliable)
            if (invitation?.id) {
                const updateByInvitationId = `
          UPDATE invitations 
          SET github_username = $1, github_user_id = $2, status = 'accepted', accepted_at = NOW()
          WHERE github_invitation_id = $3 AND status = 'pending'
          RETURNING *
        `;
                const result = await query<Invitation>(updateByInvitationId, [
                    githubUsername,
                    githubUserId,
                    invitation.id,
                ]);

                if (result.length > 0) {
                    console.log(`Matched invitation by ID: ${invitation.id} -> ${githubUsername}`);
                    return NextResponse.json({
                        message: "Invitation matched and updated",
                        email: result[0].email,
                        username: githubUsername,
                    });
                }
            }

            // Fallback: Try to match by email from invitation payload
            if (invitation?.email) {
                const updateByEmail = `
          UPDATE invitations 
          SET github_username = $1, github_user_id = $2, status = 'accepted', accepted_at = NOW()
          WHERE email = $3 AND status = 'pending'
          RETURNING *
        `;
                const result = await query<Invitation>(updateByEmail, [
                    githubUsername,
                    githubUserId,
                    invitation.email,
                ]);

                if (result.length > 0) {
                    console.log(`Matched invitation by email: ${invitation.email} -> ${githubUsername}`);
                    return NextResponse.json({
                        message: "Invitation matched and updated",
                        email: result[0].email,
                        username: githubUsername,
                    });
                }
            }

            console.log(`No matching pending invitation found for ${githubUsername}`);
            return NextResponse.json({
                message: "No matching invitation found",
                username: githubUsername,
            });
        } catch (error) {
            console.error("Error updating invitation:", error);
            return NextResponse.json(
                { error: "Failed to update invitation" },
                { status: 500 }
            );
        }
    }

    // Handle member_invited action - store the invitation if not already tracked
    if (data.action === "member_invited" && data.invitation) {
        const { invitation } = data;

        try {
            // Check if we already have this invitation
            const existing = await query(
                "SELECT id FROM invitations WHERE github_invitation_id = $1",
                [invitation.id]
            );

            if (existing.length === 0 && invitation.email) {
                // Store invitation that was created outside this app
                const insertSql = `
          INSERT INTO invitations (
            email, status, github_invitation_id, role, 
            inviter_login, inviter_id, invited_at, expires_at
          ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, $6::timestamp + INTERVAL '7 days')
          RETURNING id
        `;
                await query(insertSql, [
                    invitation.email,
                    invitation.id,
                    invitation.role || "direct_member",
                    invitation.inviter?.login || null,
                    invitation.inviter?.id || null,
                    invitation.created_at,
                ]);
                console.log(`Stored external invitation: ${invitation.email}`);
            }
        } catch (error) {
            console.error("Error storing external invitation:", error);
        }

        return NextResponse.json({ message: "Invitation tracked" });
    }

    return NextResponse.json({ message: "Event processed" }, { status: 200 });
}
