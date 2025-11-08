import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse, CostCenter, UpdateCostCenterInput } from "@/lib/types/github";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ costCenterId: string }> }
) {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const { costCenterId } = await params;

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    // Get all cost centers and find the specific one
    const response = await octokit.request(
      "GET /enterprises/{enterprise}/settings/billing/cost-centers",
      {
        enterprise,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const costCenter = response.data.costCenters.find(
      (cc: CostCenter) => cc.id === costCenterId
    );

    if (!costCenter) {
      return NextResponse.json<ApiResponse<CostCenter>>(
        { data: {} as CostCenter, error: "Cost center not found." },
        { status: 404 }
      );
    }

    const data: CostCenter = costCenter;

    return NextResponse.json<ApiResponse<CostCenter>>({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error fetching cost center.";

    return NextResponse.json<ApiResponse<CostCenter>>(
      { data: {} as CostCenter, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ costCenterId: string }> }
) {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const { costCenterId } = await params;

  let body: UpdateCostCenterInput;

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
      "PATCH /enterprises/{enterprise}/settings/billing/cost-centers/{cost_center_id}",
      {
        enterprise,
        cost_center_id: costCenterId,
        name: body.name,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const data: CostCenter = response.data;

    return NextResponse.json<ApiResponse<CostCenter>>({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error updating cost center.";

    return NextResponse.json<ApiResponse<CostCenter>>(
      { data: {} as CostCenter, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ costCenterId: string }> }
) {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  const { costCenterId } = await params;

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const response = await octokit.request(
      "DELETE /enterprises/{enterprise}/settings/billing/cost-centers/{cost_center_id}",
      {
        enterprise,
        cost_center_id: costCenterId,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const data = {
      message: response.data.message,
      id: response.data.id,
      name: response.data.name,
    };

    return NextResponse.json<ApiResponse<typeof data>>({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error deleting cost center.";

    return NextResponse.json<ApiResponse<{ message: string }>>(
      { data: { message: "" }, error: message },
      { status: 500 }
    );
  }
}
