/**
 * Email mappings API endpoint.
 * Returns all email mappings with optional search.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, getSession } from "@/lib/auth/session";
import * as emailMappingRepository from "@/lib/repositories/email-mapping-repository";

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const authenticated = await isAuthenticated();
        if (!authenticated) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // Check for admin access
        const session = await getSession();
        if (session.loginType !== 'admin') {
            return NextResponse.json(
                { error: "Admin access required" },
                { status: 403 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get("search");

        let mappings;
        if (search && search.trim()) {
            mappings = await emailMappingRepository.search(search.trim());
        } else {
            mappings = await emailMappingRepository.findAll();
        }

        return NextResponse.json({ data: mappings });
    } catch (error) {
        console.error("[Email Mappings API] Error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch email mappings";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
