import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { query as dbQuery } from "@/lib/db";
import type { ApiResponse } from "@/lib/types/github";

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const transactions = await dbQuery(
      "SELECT * FROM budget_transactions ORDER BY created_at DESC LIMIT 100"
    );

    return NextResponse.json<ApiResponse<any[]>>({ data: transactions }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch budget transactions.";
    return NextResponse.json<ApiResponse<any[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}
