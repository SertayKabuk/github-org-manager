import { NextRequest, NextResponse } from "next/server";

import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAdmin } from "@/lib/auth/helpers";
import type {
  ApiResponse,
  AddResourceToCostCenterInput,
  RemoveResourceFromCostCenterInput,
  ResourceReassignment,
} from "@/lib/types/github";

interface AddResourceResponse {
  message: string;
  reassigned_resources?: ResourceReassignment[];
}

interface RemoveResourceResponse {
  message: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ costCenterId: string }> }
) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const { costCenterId } = await params;

  let body: AddResourceToCostCenterInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<AddResourceResponse>>(
      { data: {} as AddResourceResponse, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!body.users && !body.organizations && !body.repositories) {
    return NextResponse.json<ApiResponse<AddResourceResponse>>(
      { data: {} as AddResourceResponse, error: "At least one resource type is required." },
      { status: 400 }
    );
  }

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const requestBody: Record<string, string[]> = {};
    if (body.users) requestBody.users = body.users;
    if (body.organizations) requestBody.organizations = body.organizations;
    if (body.repositories) requestBody.repositories = body.repositories;

    const response = await octokit.request(
      "POST /enterprises/{enterprise}/settings/billing/cost-centers/{cost_center_id}/resource",
      {
        enterprise,
        cost_center_id: costCenterId,
        ...requestBody,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const data: AddResourceResponse = {
      message: response.data.message,
      reassigned_resources: response.data.reassigned_resources,
    };

    return NextResponse.json<ApiResponse<AddResourceResponse>>({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error adding resources.";

    return NextResponse.json<ApiResponse<AddResourceResponse>>(
      { data: {} as AddResourceResponse, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ costCenterId: string }> }
) {
  // Check authentication
  const authError = await requireAdmin();
  if (authError) return authError;

  const { costCenterId } = await params;

  let body: RemoveResourceFromCostCenterInput;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse<RemoveResourceResponse>>(
      { data: {} as RemoveResourceResponse, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!body.users && !body.organizations && !body.repositories) {
    return NextResponse.json<ApiResponse<RemoveResourceResponse>>(
      { data: {} as RemoveResourceResponse, error: "At least one resource type is required." },
      { status: 400 }
    );
  }

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const requestBody: Record<string, string[]> = {};
    if (body.users) requestBody.users = body.users;
    if (body.organizations) requestBody.organizations = body.organizations;
    if (body.repositories) requestBody.repositories = body.repositories;

    const response = await octokit.request(
      "DELETE /enterprises/{enterprise}/settings/billing/cost-centers/{cost_center_id}/resource",
      {
        enterprise,
        cost_center_id: costCenterId,
        ...requestBody,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    const data: RemoveResourceResponse = {
      message: response.data.message,
    };

    return NextResponse.json<ApiResponse<RemoveResourceResponse>>({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error removing resources.";

    return NextResponse.json<ApiResponse<RemoveResourceResponse>>(
      { data: {} as RemoveResourceResponse, error: message },
      { status: 500 }
    );
  }
}
