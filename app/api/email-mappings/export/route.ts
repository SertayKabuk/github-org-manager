/**
 * Email mappings CSV export endpoint.
 * Exports all email mappings as a CSV file (admin only).
 */
import { NextResponse } from "next/server";
import { isAuthenticated, getSession } from "@/lib/auth/session";
import * as emailMappingRepository from "@/lib/repositories/email-mapping-repository";

/**
 * Convert email mappings to CSV format.
 */
function convertToCSV(mappings: Array<{
    github_username: string;
    email: string;
    is_primary: boolean;
    created_at: Date;
}>): string {
    // CSV header
    const headers = ["GitHub Username", "Email", "Primary", "Created At"];
    const csvRows = [headers.join(",")];

    // Add data rows
    for (const mapping of mappings) {
        const row = [
            `"${mapping.github_username.replace(/"/g, '""')}"`, // Escape quotes
            `"${mapping.email.replace(/"/g, '""')}"`,
            mapping.is_primary ? "Yes" : "No",
            `"${new Date(mapping.created_at).toISOString()}"`,
        ];
        csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
}

export async function GET() {
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

        // Fetch all email mappings (no filters or limits)
        const mappings = await emailMappingRepository.findAll();

        // Convert to CSV
        const csv = convertToCSV(mappings);

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `email-mappings-${timestamp}.csv`;

        // Return CSV response with proper headers
        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("[Email Mappings Export API] Error:", error);
        const message = error instanceof Error ? error.message : "Failed to export email mappings";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
