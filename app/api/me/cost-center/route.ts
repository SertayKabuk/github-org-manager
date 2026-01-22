import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse, CostCenter } from "@/lib/types/github";
import * as CostCenterRepository from "@/lib/repositories/cost-center-repository";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const session = await getSession();
  const login = session.user?.login;

  if (!login) {
    return NextResponse.json(
      { error: "User login not found in session" },
      { status: 400 }
    );
  }

  try {
    // Find cost center containing the user from database cache
    const userCostCenter = await CostCenterRepository.findByLogin(login);

    return NextResponse.json<ApiResponse<CostCenter | null>>({ 
      data: userCostCenter || null 
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error fetching user cost center.";
    return NextResponse.json<ApiResponse<CostCenter | null>>(
      { data: null, error: message },
      { status: 500 }
    );
  }
} 