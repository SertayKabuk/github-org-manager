/**
 * Service for cost center operations.
 * Handles business logic for adding users to cost centers.
 */
import { getSystemOctokit, getEnterpriseName, getDefaultCostCenterId } from "@/lib/octokit";

export interface AddUserToCostCenterResult {
    success: boolean;
    message: string;
    costCenterId?: string;
}

/**
 * Add a user to the default cost center.
 * Returns success: false if no default cost center is configured or on API error.
 * Does not throw - callers should handle success: false gracefully.
 */
export async function addUserToDefaultCostCenter(
    username: string
): Promise<AddUserToCostCenterResult> {
    const costCenterId = getDefaultCostCenterId();

    if (!costCenterId) {
        return {
            success: false,
            message: "DEFAULT_COST_CENTER_ID not configured, skipping cost center assignment",
        };
    }

    try {
        const octokit = getSystemOctokit();
        const enterprise = getEnterpriseName();

        const response = await octokit.request(
            "POST /enterprises/{enterprise}/settings/billing/cost-centers/{cost_center_id}/resource",
            {
                enterprise,
                cost_center_id: costCenterId,
                users: [username],
                headers: {
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            }
        );

        return {
            success: true,
            message: response.data.message || "User added to cost center",
            costCenterId,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to add user ${username} to cost center ${costCenterId}:`, message);

        return {
            success: false,
            message: `Failed to add to cost center: ${message}`,
            costCenterId,
        };
    }
}
