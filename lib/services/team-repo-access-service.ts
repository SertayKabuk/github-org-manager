import { getAutomationOctokit } from "@/lib/octokit";

const GITHUB_API_VERSION = "2022-11-28";

interface CollaboratorPermissionResponse {
  permission?: string;
  role_name?: string;
}

interface GitHubRepositoryRef {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
  };
}

export interface RepositoryTarget {
  owner: string;
  repo: string;
  fullName: string;
}

export interface AccessAutomationResult {
  outcome: "granted" | "revoked" | "noop" | "dry-run";
  message: string;
  status?: number;
  existingPermission?: string | null;
  invitationCreated?: boolean;
}

export interface AccessAutomationRequest extends RepositoryTarget {
  username: string;
  dryRun: boolean;
  installationId?: number | null;
  eventName: string;
  eventAction?: string | null;
  deliveryId: string;
}

function hasStatusCode(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === status
  );
}

function getResponseHeader(error: unknown, headerName: string): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("response" in error) ||
    typeof error.response !== "object" ||
    error.response === null ||
    !("headers" in error.response) ||
    typeof error.response.headers !== "object" ||
    error.response.headers === null
  ) {
    return null;
  }

  const headers = error.response.headers as Record<string, unknown>;
  const directValue = headers[headerName];
  if (typeof directValue === "string") {
    return directValue;
  }

  const lowerCaseValue = headers[headerName.toLowerCase()];
  return typeof lowerCaseValue === "string" ? lowerCaseValue : null;
}

function formatCollaboratorMutationError(
  error: unknown,
  request: AccessAutomationRequest,
  operation: "grant" | "revoke"
): Error {
  const acceptedPermissions = getResponseHeader(error, "x-accepted-github-permissions");

  if (hasStatusCode(error, 404)) {
    const operationLabel = operation === "grant" ? "grant" : "revoke";
    const permissionsHint = acceptedPermissions
      ? ` GitHub says accepted permissions are: ${acceptedPermissions}.`
      : "";

    return new Error(
      `GitHub returned 404 while trying to ${operationLabel} direct collaborator access for ${request.username} on ${request.fullName}. ` +
        `For a private organization repository this usually means the automation token cannot administer the repository, the repository is not accessible to the token/app installation, or organization policy blocks the collaborator change.${permissionsHint}`
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`Unknown error while trying to ${operation} collaborator access on ${request.fullName}.`);
}

async function getExistingPermission(
  owner: string,
  repo: string,
  username: string,
  installationId?: number | null
): Promise<string | null> {
  const octokit = await getAutomationOctokit(installationId ?? undefined);

  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/collaborators/{username}/permission",
      {
        owner,
        repo,
        username,
        headers: {
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
        },
      }
    );

    const data = response.data as CollaboratorPermissionResponse;
    return data.permission || data.role_name || null;
  } catch (error) {
    if (hasStatusCode(error, 404)) {
      return null;
    }

    throw error;
  }
}

function logAccessEvent(
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown>
) {
  console[level](`[TeamRepoAccess] ${message}`, context);
}

export async function grantDirectAdmin(
  request: AccessAutomationRequest
): Promise<AccessAutomationResult> {
  const existingPermission = await getExistingPermission(
    request.owner,
    request.repo,
    request.username,
    request.installationId
  );

  const context = {
    deliveryId: request.deliveryId,
    event: request.eventName,
    action: request.eventAction || null,
    repo: request.fullName,
    targetUsername: request.username,
    dryRun: request.dryRun,
    existingPermission,
  };

  if (existingPermission === "admin") {
    logAccessEvent("info", "Direct admin grant skipped because user already has admin", context);
    return {
      outcome: "noop",
      message: "User already has admin permission",
      existingPermission,
    };
  }

  if (request.dryRun) {
    logAccessEvent("info", "Dry-run: would grant direct admin access", context);
    return {
      outcome: "dry-run",
      message: "Dry-run mode enabled; no collaborator API call was made",
      existingPermission,
    };
  }

  const octokit = await getAutomationOctokit(request.installationId ?? undefined);
  let response;

  try {
    response = await octokit.request(
      "PUT /repos/{owner}/{repo}/collaborators/{username}",
      {
        owner: request.owner,
        repo: request.repo,
        username: request.username,
        permission: "admin",
        headers: {
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
        },
      }
    );
  } catch (error) {
    throw formatCollaboratorMutationError(error, request, "grant");
  }

  const invitationCreated = response.status === 201;

  logAccessEvent("info", "Granted direct admin access", {
    ...context,
    outcome: invitationCreated ? "invited" : "granted",
    status: response.status,
  });

  return {
    outcome: "granted",
    message: invitationCreated
      ? "Collaborator invitation created with admin permission"
      : "Collaborator permission updated to admin",
    status: response.status,
    existingPermission,
    invitationCreated,
  };
}

export async function revokeDirectAccess(
  request: AccessAutomationRequest
): Promise<AccessAutomationResult> {
  const existingPermission = await getExistingPermission(
    request.owner,
    request.repo,
    request.username,
    request.installationId
  );

  const context = {
    deliveryId: request.deliveryId,
    event: request.eventName,
    action: request.eventAction || null,
    repo: request.fullName,
    targetUsername: request.username,
    dryRun: request.dryRun,
    existingPermission,
  };

  if (!existingPermission) {
    logAccessEvent("info", "Direct access revoke skipped because no permission was found", context);
    return {
      outcome: "noop",
      message: "User does not currently have repository access",
      existingPermission,
    };
  }

  if (request.dryRun) {
    logAccessEvent("info", "Dry-run: would revoke direct collaborator access", context);
    return {
      outcome: "dry-run",
      message: "Dry-run mode enabled; no collaborator deletion was made",
      existingPermission,
    };
  }

  const octokit = await getAutomationOctokit(request.installationId ?? undefined);
  let response;

  try {
    response = await octokit.request(
      "DELETE /repos/{owner}/{repo}/collaborators/{username}",
      {
        owner: request.owner,
        repo: request.repo,
        username: request.username,
        headers: {
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
        },
      }
    );
  } catch (error) {
    throw formatCollaboratorMutationError(error, request, "revoke");
  }

  logAccessEvent("info", "Revoked direct collaborator access", {
    ...context,
    status: response.status,
  });

  return {
    outcome: "revoked",
    message: "Direct collaborator access removed",
    status: response.status,
    existingPermission,
  };
}

export async function listTeamRepositories(
  org: string,
  teamSlug: string,
  installationId?: number | null
): Promise<RepositoryTarget[]> {
  const octokit = await getAutomationOctokit(installationId ?? undefined);
  const repositories = await octokit.paginate(octokit.rest.teams.listReposInOrg, {
    org,
    team_slug: teamSlug,
    per_page: 100,
  });

  return repositories.map((repository) => {
    const typedRepository = repository as GitHubRepositoryRef;

    return {
      owner: typedRepository.owner.login,
      repo: typedRepository.name,
      fullName: typedRepository.full_name,
    };
  });
}

export async function revokeDirectAccessForTeamRepositories(options: {
  org: string;
  teamSlug: string;
  username: string;
  dryRun: boolean;
  deliveryId: string;
  eventName: string;
  eventAction?: string | null;
  installationId?: number | null;
}): Promise<AccessAutomationResult[]> {
  const repositories = await listTeamRepositories(
    options.org,
    options.teamSlug,
    options.installationId
  );

  const results: AccessAutomationResult[] = [];

  for (const repository of repositories) {
    const result = await revokeDirectAccess({
      ...repository,
      username: options.username,
      dryRun: options.dryRun,
      deliveryId: options.deliveryId,
      eventName: options.eventName,
      eventAction: options.eventAction,
      installationId: options.installationId,
    });

    results.push(result);
  }

  return results;
}
