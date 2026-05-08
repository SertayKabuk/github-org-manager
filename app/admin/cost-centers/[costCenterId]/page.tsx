'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import ResourceCard from "@/components/cost-centers/ResourceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { withBasePath } from "@/lib/utils";

import type {
  ApiResponse,
  CostCenter,
  CostCenterResource,
  EnterpriseMember,
  GitHubMember,
  GitHubRepository,
} from "@/lib/types/github";

type CostCenterResponse = ApiResponse<CostCenter>;
type ResourceActionResponse = ApiResponse<{ message: string }>;
type OrganizationOption = { login: string; name: string | null };
type ResourceOptions = {
  members: GitHubMember[];
  repositories: GitHubRepository[];
  organizations: OrganizationOption[];
};

export default function CostCenterDetailsPage() {
  const params = useParams<{ costCenterId: string }>();
  const costCenterId = params?.costCenterId;

  const {
    data: costCenter,
    isLoading: loading,
    error: costCenterError,
  } = useQuery({
    queryKey: ["cost-center", costCenterId],
    enabled: Boolean(costCenterId),
    queryFn: async (): Promise<CostCenter> => {
      const response = await fetch(withBasePath(`/api/cost-centers/${costCenterId}`));

      if (!response.ok) {
        throw new Error(`Failed to load cost center (${response.status})`);
      }

      const json = (await response.json()) as CostCenterResponse;
      return json.data;
    },
  });

  const error = costCenterError instanceof Error
    ? costCenterError.message
    : costCenterError
      ? "Failed to load cost center data."
      : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!costCenter || !costCenterId) {
    return <ErrorMessage message="Cost center not found." />;
  }

  return (
    <CostCenterDetailsContent
      key={`${costCenter.id}:${costCenter.name}`}
      costCenter={costCenter}
      costCenterId={costCenterId}
    />
  );
}

function CostCenterDetailsContent({
  costCenter,
  costCenterId,
}: {
  costCenter: CostCenter;
  costCenterId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formState, setFormState] = useState<{ name: string }>(() => ({
    name: costCenter.name,
  }));
  const [showAddResource, setShowAddResource] = useState(false);
  const [resourceType, setResourceType] = useState<"users" | "organizations" | "repositories">("users");
  const [resourceName, setResourceName] = useState("");
  const [addingResource, setAddingResource] = useState(false);
  const [addingAllMembers, setAddingAllMembers] = useState(false);

  const {
    data: resourceOptions,
    isLoading: loadingResources,
    error: resourceOptionsError,
  } = useQuery({
    queryKey: ["cost-center-resource-options"],
    enabled: showAddResource,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ResourceOptions> => {
      const [membersResponse, reposResponse, orgsResponse] = await Promise.all([
        fetch(withBasePath("/api/members")),
        fetch(withBasePath("/api/repositories")),
        fetch(withBasePath("/api/organizations")),
      ]);

      const [members, repositories, organizations] = await Promise.all([
        membersResponse.ok
          ? membersResponse.json().then((json: ApiResponse<GitHubMember[]>) => json.data)
          : Promise.resolve<GitHubMember[]>([]),
        reposResponse.ok
          ? reposResponse.json().then((json: ApiResponse<GitHubRepository[]>) => json.data)
          : Promise.resolve<GitHubRepository[]>([]),
        orgsResponse.ok
          ? orgsResponse
              .json()
              .then((json: ApiResponse<OrganizationOption[]>) => json.data)
          : Promise.resolve<OrganizationOption[]>([]),
      ]);

      return {
        members,
        repositories,
        organizations,
      };
    },
  });

  const resourceOptionsErrorMessage = resourceOptionsError instanceof Error
    ? resourceOptionsError.message
    : resourceOptionsError
      ? "Failed to load available resources."
      : null;

  async function refreshCostCenter() {
    await queryClient.invalidateQueries({ queryKey: ["cost-center", costCenterId] });
  }

  async function handleUpdateCostCenter() {
    setSaving(true);
    try {
      const response = await fetch(withBasePath(`/api/cost-centers/${costCenterId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formState.name }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as CostCenterResponse | null;
        throw new Error(json?.error ?? `Failed to update cost center (${response.status})`);
      }

      const json = (await response.json()) as CostCenterResponse;
      queryClient.setQueryData(["cost-center", costCenterId], json.data);
      setFormState({ name: json.data.name });
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update cost center.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCostCenter() {
    const confirmed = window.confirm(
      `Delete cost center "${costCenter.name}"? This will archive the cost center and remove all resource assignments.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(withBasePath(`/api/cost-centers/${costCenterId}`), { method: "DELETE" });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as CostCenterResponse | null;
        throw new Error(json?.error ?? `Failed to delete cost center (${response.status})`);
      }

      await queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      router.push("/cost-centers");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete cost center.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddAllMembers() {
    const confirmed = window.confirm("Are you sure you want to add ALL enterprise members to this cost center?");
    if (!confirmed) return;

    setAddingAllMembers(true);
    try {
      const membersResponse = await fetch(withBasePath("/api/enterprise-members"));
      if (!membersResponse.ok) {
        throw new Error("Failed to fetch enterprise members");
      }
      const membersJson = (await membersResponse.json()) as ApiResponse<EnterpriseMember[]>;
      const allMembers = membersJson.data;

      if (allMembers.length === 0) {
        throw new Error("No enterprise members found to add.");
      }

      const userLogins = allMembers.map((member) => member.login);
      const chunkSize = 50;

      for (let i = 0; i < userLogins.length; i += chunkSize) {
        const chunk = userLogins.slice(i, i + chunkSize);

        const response = await fetch(withBasePath(`/api/cost-centers/${costCenterId}/resource`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ users: chunk }),
        });

        if (!response.ok) {
          const json = (await response.json().catch(() => null)) as ResourceActionResponse | null;
          throw new Error(json?.error ?? `Failed to add resources batch ${Math.floor(i / chunkSize) + 1} (${response.status})`);
        }
      }

      await refreshCostCenter();
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add all members.");
    } finally {
      setAddingAllMembers(false);
    }
  }

  async function handleAddResource() {
    if (!resourceName.trim()) return;

    setAddingResource(true);
    try {
      const body: Record<string, string[]> = {
        [resourceType]: [resourceName.trim()],
      };

      const response = await fetch(withBasePath(`/api/cost-centers/${costCenterId}/resource`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as ResourceActionResponse | null;
        throw new Error(json?.error ?? `Failed to add resource (${response.status})`);
      }

      await refreshCostCenter();
      setResourceName("");
      setShowAddResource(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add resource.");
    } finally {
      setAddingResource(false);
    }
  }

  async function handleRemoveResource(resource: CostCenterResource) {
    const confirmed = window.confirm(`Remove "${resource.name}" from this cost center?`);
    if (!confirmed) return;

    try {
      const resourceTypeKey = resource.type === "User"
        ? "users"
        : resource.type === "Repo"
          ? "repositories"
          : "organizations";

      const body: Record<string, string[]> = {
        [resourceTypeKey]: [resource.name],
      };

      const response = await fetch(withBasePath(`/api/cost-centers/${costCenterId}/resource`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as ResourceActionResponse | null;
        throw new Error(json?.error ?? `Failed to remove resource (${response.status})`);
      }

      await refreshCostCenter();
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to remove resource.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{costCenter.name}</h1>
          <p className="text-muted-foreground mt-2">
            Manage cost center settings and resources.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/cost-centers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to cost centers
          </Link>
        </Button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <Card>
        <CardHeader>
          <CardTitle>Cost Center Settings</CardTitle>
          <CardDescription>Update cost center information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cost center name</label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, name: event.target.value }))
                }
              />
            </div>
            {costCenter.azure_subscription && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Azure Subscription</label>
                <Input value={costCenter.azure_subscription} disabled className="font-mono text-xs" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => void handleUpdateCostCenter()} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteCostCenter()}
              disabled={deleting || saving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Deleting..." : "Delete cost center"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resources</CardTitle>
              <CardDescription>
                Users, repositories, and organizations assigned to this cost center
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => void handleAddAllMembers()}
                disabled={addingAllMembers}
                variant="outline"
                size="sm"
              >
                {addingAllMembers ? "Adding All..." : "Add All Enterprise Members"}
              </Button>
              <Button onClick={() => setShowAddResource((value) => !value)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {resourceOptionsErrorMessage && showAddResource && (
            <ErrorMessage message={resourceOptionsErrorMessage} />
          )}

          {showAddResource && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource Type</label>
                  <Select
                    value={resourceType}
                    onValueChange={(value) => {
                      setResourceType(value as typeof resourceType);
                      setResourceName("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">User</SelectItem>
                      <SelectItem value="repositories">Repository</SelectItem>
                      <SelectItem value="organizations">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {resourceType === "users"
                      ? "Select User"
                      : resourceType === "repositories"
                        ? "Select Repository"
                        : "Organization Name"}
                  </label>
                  {resourceType === "users" && (
                    <SearchableCombobox
                      options={(resourceOptions?.members ?? []).map((member) => ({
                        value: member.login,
                        label: member.login,
                        description: member.name || undefined,
                      }))}
                      value={resourceName}
                      onValueChange={setResourceName}
                      placeholder="Select a user..."
                      searchPlaceholder="Search users..."
                      emptyText="No users found."
                      loading={loadingResources}
                      disabled={addingResource}
                    />
                  )}
                  {resourceType === "repositories" && (
                    <SearchableCombobox
                      options={(resourceOptions?.repositories ?? []).map((repo) => ({
                        value: repo.full_name,
                        label: repo.full_name,
                        description: repo.description || undefined,
                      }))}
                      value={resourceName}
                      onValueChange={setResourceName}
                      placeholder="Select a repository..."
                      searchPlaceholder="Search repositories..."
                      emptyText="No repositories found."
                      loading={loadingResources}
                      disabled={addingResource}
                    />
                  )}
                  {resourceType === "organizations" && (
                    <SearchableCombobox
                      options={(resourceOptions?.organizations ?? []).map((org) => ({
                        value: org.login,
                        label: org.login,
                        description: org.name || undefined,
                      }))}
                      value={resourceName}
                      onValueChange={setResourceName}
                      placeholder="Select an organization..."
                      searchPlaceholder="Search organizations..."
                      emptyText="No organizations found."
                      loading={loadingResources}
                      disabled={addingResource}
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddResource(false)} disabled={addingResource}>
                  Cancel
                </Button>
                <Button onClick={() => void handleAddResource()} disabled={addingResource || !resourceName.trim()}>
                  {addingResource ? "Adding..." : "Add Resource"}
                </Button>
              </div>
            </div>
          )}

          {costCenter.resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No resources assigned to this cost center.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click &ldquo;Add Resource&rdquo; to assign users, repositories, or organizations.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {costCenter.resources.map((resource, idx) => (
                <div key={`${resource.type}-${resource.name}-${idx}`} className="flex items-center gap-2">
                  <div className="flex-1">
                    <ResourceCard resource={resource} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleRemoveResource(resource)}
                    title="Remove resource"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
