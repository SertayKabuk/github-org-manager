/**
 * GitHub Webhook handler for organization member events.
 * This endpoint receives webhooks from GitHub and updates invitation records
 * when users accept invitations to match GitHub username with company email.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import * as invitationRepo from "@/lib/repositories/invitation-repository";

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
                const result = await invitationRepo.updateWithGitHubUser(
                    invitation.id,
                    githubUsername,
                    githubUserId
                );

                if (result) {
                    console.log(`Matched invitation by ID: ${invitation.id} -> ${githubUsername}`);
                    return NextResponse.json({
                        message: "Invitation matched and updated",
                        email: result.email,
                        username: githubUsername,
                    });
                }
            }

            // Fallback: Try to match by email from invitation payload
            if (invitation?.email) {
                const result = await invitationRepo.updateByEmailWithGitHubUser(
                    invitation.email,
                    githubUsername,
                    githubUserId
                );

                if (result) {
                    console.log(`Matched invitation by email: ${invitation.email} -> ${githubUsername}`);
                    return NextResponse.json({
                        message: "Invitation matched and updated",
                        email: result.email,
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
            const existing = await invitationRepo.findByGitHubInvitationId(invitation.id);

            if (!existing && invitation.email) {
                // Store invitation that was created outside this app
                await invitationRepo.create({
                    email: invitation.email,
                    status: 'pending',
                    github_invitation_id: invitation.id,
                    role: invitation.role || "direct_member",
                    inviter_login: invitation.inviter?.login || null,
                    inviter_id: invitation.inviter?.id || null,
                    invited_at: invitation.created_at,
                });
                console.log(`Stored external invitation: ${invitation.email}`);
            }
        } catch (error) {
            console.error("Error storing external invitation:", error);
        }

        return NextResponse.json({ message: "Invitation tracked" });
    }

    return NextResponse.json({ message: "Event processed" }, { status: 200 });
}
