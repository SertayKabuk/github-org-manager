import { NextResponse } from "next/server";
import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { getSession } from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse, CostCenter } from "@/lib/types/github";

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
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    // Fetch all active cost centers for the enterprise
    // NOTE: If there are many, we might need pagination if supported,
    // but usually cost centers are not in the thousands.
    const response = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/cost-centers",
      {
        enterprise,
        state: "active",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const allCostCenters: CostCenter[] = response.data.costCenters || [];
    
    // Find cost center containing the user
    // Resource name match is case-insensitive usually but we'll check carefully
    const userCostCenter = allCostCenters.find(cc => 
      cc.resources.some(r => 
        r.type === "User" && r.name.toLowerCase() === login.toLowerCase()
      )
    );

    return NextResponse.json<ApiResponse<CostCenter | null>>({ 
      data: userCostCenter || null 
    });
  } catch (error) {
    console.error("Error fetching user cost center:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost center info" },
      { status: 500 }
    );
  }
}
