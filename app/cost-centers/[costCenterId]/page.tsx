'use client';

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

import ResourceCard from "@/components/cost-centers/ResourceCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";

import type {
  ApiResponse,
  CostCenter,
  CostCenterResource,
  EnterpriseMember,
  GitHubMember,
  GitHubRepository
} from "@/lib/types/github";

type CostCenterResponse = ApiResponse<CostCenter>;
type ResourceActionResponse = ApiResponse<{ message: string }>;

export default function CostCenterDetailsPage() {
  const params = useParams<{ costCenterId: string }>();
  const router = useRouter();
  const costCenterId = params?.costCenterId;

  const [costCenter, setCostCenter] = useState<CostCenter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formState, setFormState] = useState<{ name: string } | null>(null);

  // Add resource form state
  const [showAddResource, setShowAddResource] = useState(false);
  const [resourceType, setResourceType] = useState<"users" | "organizations" | "repositories">("users");
  const [resourceName, setResourceName] = useState("");
  const [addingResource, setAddingResource] = useState(false);
  const [addingAllMembers, setAddingAllMembers] = useState(false);

  // Available resources for combobox
  const [members, setMembers] = useState<GitHubMember[]>([]);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ login: string; name: string | null }>>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const loadCostCenterData = useCallback(async () => {
    if (!costCenterId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cost-centers/${costCenterId}`);

      if (!response.ok) {
        throw new Error(`Failed to load cost center (${response.status})`);
      }

      const json = (await response.json()) as CostCenterResponse;
      setCostCenter(json.data);
      setFormState({ name: json.data.name });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load cost center data.");
    } finally {
      setLoading(false);
    }
  }, [costCenterId]);

  useEffect(() => {
    loadCostCenterData();
  }, [loadCostCenterData]);

  // Load available resources when showing add form
  useEffect(() => {
    if (showAddResource) {
      loadAvailableResources();
    }
  }, [showAddResource]);

  const loadAvailableResources = async () => {
    setLoadingResources(true);
    try {
      const [membersResponse, reposResponse, orgsResponse] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/repositories"),
        fetch("/api/organizations"),
      ]);

      if (membersResponse.ok) {
        const membersJson = (await membersResponse.json()) as ApiResponse<GitHubMember[]>;
        setMembers(membersJson.data);
      }

      if (reposResponse.ok) {
        const reposJson = (await reposResponse.json()) as ApiResponse<GitHubRepository[]>;
        setRepositories(reposJson.data);
      }

      if (orgsResponse.ok) {
        const orgsJson = (await orgsResponse.json()) as ApiResponse<Array<{ id: number; login: string; name: string | null }>>;
        setOrganizations(orgsJson.data);
      }
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleUpdateCostCenter = async () => {
    if (!costCenterId || !formState) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/cost-centers/${costCenterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formState.name }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as CostCenterResponse | null;
        throw new Error(json?.error ?? `Failed to update cost center (${response.status})`);
      }

      const json = (await response.json()) as CostCenterResponse;
      setCostCenter(json.data);
      setFormState({ name: json.data.name });
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update cost center.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCostCenter = async () => {
    if (!costCenterId || !costCenter) return;

    const confirmed = window.confirm(
      `Delete cost center "${costCenter.name}"? This will archive the cost center and remove all resource assignments.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/cost-centers/${costCenterId}`, { method: "DELETE" });
      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as CostCenterResponse | null;
        throw new Error(json?.error ?? `Failed to delete cost center (${response.status})`);
      }
      router.push("/cost-centers");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete cost center.");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddAllMembers = async () => {
    if (!costCenterId) return;

    const confirmed = window.confirm("Are you sure you want to add ALL enterprise members to this cost center?");
    if (!confirmed) return;

    setAddingAllMembers(true);
    try {
      // Fetch enterprise members using GraphQL API
      const membersResponse = await fetch("/api/enterprise-members");
      if (!membersResponse.ok) {
         throw new Error("Failed to fetch enterprise members");
      }
      const membersJson = (await membersResponse.json()) as ApiResponse<EnterpriseMember[]>;
      const allMembers = membersJson.data;

      if (allMembers.length === 0) {
          throw new Error("No enterprise members found to add.");
      }

      const userLogins = allMembers.map(m => m.login);
      const chunkSize = 50;

      for (let i = 0; i < userLogins.length; i += chunkSize) {
        const chunk = userLogins.slice(i, i + chunkSize);

        const body = {
          users: chunk
        };

        const response = await fetch(`/api/cost-centers/${costCenterId}/resource`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const json = (await response.json().catch(() => null)) as ResourceActionResponse | null;
          throw new Error(json?.error ?? `Failed to add resources batch ${Math.floor(i / chunkSize) + 1} (${response.status})`);
        }
      }

      await loadCostCenterData();
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add all members.");
    } finally {
      setAddingAllMembers(false);
    }
  };

  const handleAddResource = async () => {
    if (!costCenterId || !resourceName.trim()) return;

    setAddingResource(true);
    try {
      const body: Record<string, string[]> = {
        [resourceType]: [resourceName.trim()],
      };

      const response = await fetch(`/api/cost-centers/${costCenterId}/resource`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as ResourceActionResponse | null;
        throw new Error(json?.error ?? `Failed to add resource (${response.status})`);
      }

      // Reload cost center data to get updated resources
      await loadCostCenterData();
      setResourceName("");
      setShowAddResource(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add resource.");
    } finally {
      setAddingResource(false);
    }
  };

  const handleRemoveResource = async (resource: CostCenterResource) => {
    if (!costCenterId) return;

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

      const response = await fetch(`/api/cost-centers/${costCenterId}/resource`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as ResourceActionResponse | null;
        throw new Error(json?.error ?? `Failed to remove resource (${response.status})`);
      }

      // Reload cost center data to get updated resources
      await loadCostCenterData();
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to remove resource.");
    }
  };

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
    return <ErrorMessage message={error} onDismiss={() => setError(null)} />;
  }

  if (!costCenter || !formState) {
    return <ErrorMessage message="Cost center not found." />;
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
                  setFormState((state) =>
                    state ? { ...state, name: event.target.value } : state
                  )
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
            <Button onClick={handleUpdateCostCenter} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCostCenter}
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
                onClick={handleAddAllMembers}
                disabled={addingAllMembers || loading}
                variant="outline"
                size="sm"
              >
                {addingAllMembers ? "Adding All..." : "Add All Enterprise Members"}
              </Button>
              <Button onClick={() => setShowAddResource(!showAddResource)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddResource && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resource Type</label>
                  <Select value={resourceType} onValueChange={(value) => {
                    setResourceType(value as typeof resourceType);
                    setResourceName(""); // Reset selection when type changes
                  }}>
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
                      options={members.map((member) => ({
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
                      options={repositories.map((repo) => ({
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
                      options={organizations.map((org) => ({
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
                <Button onClick={handleAddResource} disabled={addingResource || !resourceName.trim()}>
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
                    onClick={() => handleRemoveResource(resource)}
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
