import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { query as dbQuery } from "@/lib/db";
import type { ApiResponse } from "@/lib/types/github";

interface BudgetTransaction {
  id: number;
  transaction_type: "create" | "transfer";
  from_user: string | null;
  to_user: string | null;
  amount: number;
  transferred_amount: number;
  note: string | null;
  created_at: string;
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const transactions = await dbQuery<BudgetTransaction>(
      "SELECT * FROM budget_transactions ORDER BY created_at DESC LIMIT 100"
    );

    return NextResponse.json<ApiResponse<BudgetTransaction[]>>({ data: transactions }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch budget transactions.";
    return NextResponse.json<ApiResponse<BudgetTransaction[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}
