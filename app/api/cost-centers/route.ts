import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type { ApiResponse, CostCenter, CreateCostCenterInput, CostCenterState } from "@/lib/types/github";

const STATE_FILTERS = new Set(["active", "deleted"] as const);

export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const stateParam = request.nextUrl.searchParams.get("state") as CostCenterState | null;

  // Validate state parameter if provided
  if (stateParam && !STATE_FILTERS.has(stateParam)) {
    return NextResponse.json<ApiResponse<CostCenter[]>>(
      { data: [], error: "Invalid state filter. Must be 'active' or 'deleted'." },
      { status: 400 }
    );
  }

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const response = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/cost-centers",
      {
        enterprise,
        state: stateParam || undefined,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const data: CostCenter[] = response.data.costCenters || [];

    return NextResponse.json<ApiResponse<CostCenter[]>>({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error fetching cost centers.";

    return NextResponse.json<ApiResponse<CostCenter[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  let body: CreateCostCenterInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<CostCenter>>(
      { data: {} as CostCenter, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!body.name?.trim()) {
    return NextResponse.json<ApiResponse<CostCenter>>(
      { data: {} as CostCenter, error: "Cost center name is required." },
      { status: 400 }
    );
  }

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const response = await octokit.request(
      "POST /enterprises/{enterprise}/settings/billing/cost-centers",
      {
        enterprise,
        name: body.name,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const data: CostCenter = {
      id: response.data.id,
      name: response.data.name,
      state: "active",
      resources: response.data.resources || [],
    };

    return NextResponse.json<ApiResponse<CostCenter>>({ data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error creating cost center.";

    return NextResponse.json<ApiResponse<CostCenter>>(
      { data: {} as CostCenter, error: message },
      { status: 500 }
    );
  }
}
