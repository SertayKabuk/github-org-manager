import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/helpers";
import * as EmailMappingRepository from "@/lib/repositories/email-mapping-repository";
import { ApiResponse } from "@/lib/types/github";
import { EmailMappingEntity } from "@/lib/entities/email-mapping";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  const userId = session.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "User ID not found in session" },
      { status: 400 }
    );
  }

  try {
    const data = await EmailMappingRepository.findByGitHubUserId(userId);
    return NextResponse.json<ApiResponse<EmailMappingEntity[]>>({ data });
  } catch (error) {
    console.error("Error fetching user email mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch email mappings" },
      { status: 500 }
    );
  }
}
