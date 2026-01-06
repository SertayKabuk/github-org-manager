/**
 * API routes for invitation management.
 * POST - Create a new invitation via GitHub API and store in database
 * GET - List all invitations from database
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { getAuthenticatedOctokit, getOrgName } from "@/lib/octokit";
import { getUser } from "@/lib/auth/session";
import * as invitationRepo from "@/lib/repositories/invitation-repository";
import type { ApiResponse, CreateInvitationInput } from "@/lib/types/github";
import type { InvitationEntity } from "@/lib/entities/invitation";

/**
 * GET /api/invitations
 * List all invitations with optional status filter
 */
export async function GET(request: NextRequest) {
    const authError = await requireAdmin();
    if (authError) return authError;

    const status = request.nextUrl.searchParams.get("status");

    try {
        // Update expired invitations first
        await invitationRepo.markExpired();

        const invitations = await invitationRepo.findAll(status || undefined);

        return NextResponse.json<ApiResponse<InvitationEntity[]>>({ data: invitations });
    } catch (error) {
        console.error("Error fetching invitations:", error);
        return NextResponse.json<ApiResponse<InvitationEntity[]>>(
            { data: [], error: "Failed to fetch invitations" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/invitations
 * Create a new invitation and send via GitHub API
 */
export async function POST(request: NextRequest) {
    const authError = await requireAdmin();
    if (authError) return authError;

    let body: CreateInvitationInput;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json<ApiResponse<InvitationEntity>>(
            { data: {} as InvitationEntity, error: "Invalid request body" },
            { status: 400 }
        );
    }

    const { email, role = "direct_member", team_ids } = body;

    if (!email || !email.includes("@")) {
        return NextResponse.json<ApiResponse<InvitationEntity>>(
            { data: {} as InvitationEntity, error: "Valid email address is required" },
            { status: 400 }
        );
    }

    try {
        const octokit = await getAuthenticatedOctokit();
        const org = getOrgName();
        const user = await getUser();

        // Send invitation via GitHub API
        const { data: githubInvitation } = await octokit.rest.orgs.createInvitation({
            org,
            email,
            role,
            team_ids,
        });

        // Store invitation in database
        const invitation = await invitationRepo.create({
            email,
            status: "pending",
            github_invitation_id: githubInvitation.id,
            role,
            team_ids: team_ids || null,
            inviter_login: user?.login || null,
            inviter_id: user?.id || null,
        });

        return NextResponse.json<ApiResponse<InvitationEntity>>({ data: invitation }, { status: 201 });
    } catch (error) {
        console.error("Error creating invitation:", error);

        const message = error instanceof Error ? error.message : "Failed to create invitation";

        // Check if the error is related to an existing invitation
        if (message.includes("already a member") || message.includes("pending invitation")) {
            return NextResponse.json<ApiResponse<InvitationEntity>>(
                { data: {} as InvitationEntity, error: "User already has a pending invitation or is a member" },
                { status: 409 }
            );
        }

        return NextResponse.json<ApiResponse<InvitationEntity>>(
            { data: {} as InvitationEntity, error: message },
            { status: 500 }
        );
    }
}
