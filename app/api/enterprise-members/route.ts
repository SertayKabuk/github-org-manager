import { NextResponse } from "next/server";

import { getEnterpriseName, getAuthenticatedOctokit } from "@/lib/octokit";
import { requireAuth } from "@/lib/auth/helpers";
import type { ApiResponse, EnterpriseMember } from "@/lib/types/github";

interface EnterpriseGraphQLResponse {
  enterprise: {
    members: {
      nodes: Array<{
        __typename: "EnterpriseUserAccount" | "User";
        id: string;
        login: string;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
}

const ENTERPRISE_MEMBERS_QUERY = `
  query enterpriseMembers($slug: String!, $cursor: String) {
    enterprise(slug: $slug) {
      members(first: 100, after: $cursor) {
        nodes {
          __typename
          ... on EnterpriseUserAccount {
            id
            login
          }
          ... on User {
            id
            login
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export async function GET() {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const enterprise = getEnterpriseName();
    const octokit = await getAuthenticatedOctokit();

    const members: EnterpriseMember[] = [];

    // Use GraphQL pagination iterator
    const pageIterator = octokit.graphql.paginate.iterator<EnterpriseGraphQLResponse>(
      ENTERPRISE_MEMBERS_QUERY,
      { slug: enterprise }
    );

    for await (const response of pageIterator) {
      const nodes = response.enterprise.members.nodes;
      for (const node of nodes) {
        members.push({
          id: node.id,
          login: node.login,
          type: node.__typename,
        });
      }
    }

    const payload: ApiResponse<EnterpriseMember[]> = {
      data: members,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "x-total-count": members.length.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error fetching enterprise members.";

    return NextResponse.json<ApiResponse<EnterpriseMember[]>>(
      { data: [], error: message },
      { status: 500 }
    );
  }
}
