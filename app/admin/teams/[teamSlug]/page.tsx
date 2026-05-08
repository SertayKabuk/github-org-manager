'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, RotateCcw, Save, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import TeamMemberManager from "@/components/teams/TeamMemberManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMembers, useTeam, useTeamMembers } from "@/lib/hooks";
import { withBasePath } from "@/lib/utils";

import type { ApiResponse, GitHubMember, GitHubTeam, TeamPrivacy } from "@/lib/types/github";

type TeamResponse = ApiResponse<GitHubTeam>;

export default function TeamDetailsPage() {
  const params = useParams<{ teamSlug: string }>();
  const teamSlug = params?.teamSlug;

  const {
    data: team,
    isLoading: teamLoading,
    error: teamError,
  } = useTeam(teamSlug);

  const {
    data: teamMembers = [],
    isLoading: teamMembersLoading,
    error: teamMembersError,
  } = useTeamMembers(teamSlug);

  const {
    data: orgMembers = [],
    isLoading: orgMembersLoading,
    error: orgMembersError,
  } = useMembers();

  const loading = teamLoading || teamMembersLoading || orgMembersLoading;
  const error = teamError || teamMembersError || orgMembersError;

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
    return <ErrorMessage message={error instanceof Error ? error.message : error} />;
  }

  if (!team || !teamSlug) {
    return <ErrorMessage message="Team not found." />;
  }

  return (
    <TeamDetailsContent
      key={`${team.slug}:${team.name}:${team.description ?? ""}:${team.privacy}`}
      team={team}
      teamSlug={teamSlug}
      teamMembers={teamMembers}
      orgMembers={orgMembers}
    />
  );
}

function TeamDetailsContent({
  team,
  teamSlug,
  teamMembers,
  orgMembers,
}: {
  team: GitHubTeam;
  teamSlug: string;
  teamMembers: GitHubMember[];
  orgMembers: GitHubMember[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    name: string;
    description: string;
    privacy: TeamPrivacy;
  }>(() => ({
    name: team.name,
    description: team.description ?? "",
    privacy: team.privacy,
  }));

  function handleReset() {
    setFormState({
      name: team.name,
      description: team.description ?? "",
      privacy: team.privacy,
    });
    void queryClient.invalidateQueries({ queryKey: ["teams", teamSlug] });
  }

  async function handleUpdateTeam() {
    setSaving(true);
    setActionError(null);
    try {
      const response = await fetch(withBasePath(`/api/teams/${teamSlug}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          privacy: formState.privacy,
        }),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as TeamResponse | null;
        throw new Error(json?.error ?? `Failed to update team (${response.status})`);
      }

      const json = (await response.json()) as TeamResponse;
      queryClient.setQueryData(["teams", teamSlug], json.data);
      setFormState({
        name: json.data.name,
        description: json.data.description ?? "",
        privacy: json.data.privacy,
      });
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to update team.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTeam() {
    const confirmed = window.confirm(
      `Delete team "${team.name}"? This will remove all its memberships.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setActionError(null);
    try {
      const response = await fetch(withBasePath(`/api/teams/${teamSlug}`), { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const json = (await response.json().catch(() => null)) as TeamResponse | null;
        throw new Error(json?.error ?? `Failed to delete team (${response.status})`);
      }

      await queryClient.invalidateQueries({ queryKey: ["teams"] });
      router.push("/teams");
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to delete team.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-muted-foreground mt-2">
            Manage team settings and memberships.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/teams">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to teams
          </Link>
        </Button>
      </div>

      {actionError && (
        <ErrorMessage message={actionError} onDismiss={() => setActionError(null)} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
          <CardDescription>Update team information and privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team name</label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formState.description}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, description: event.target.value }))
                }
                placeholder="Team description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Privacy</label>
              <Select
                value={formState.privacy}
                onValueChange={(value) =>
                  setFormState((state) => ({ ...state, privacy: value as TeamPrivacy }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="secret">Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={() => void handleUpdateTeam()} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteTeam()}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Deleting..." : "Delete team"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <TeamMemberManager
        teamSlug={teamSlug}
        initialTeamMembers={teamMembers}
        initialOrgMembers={orgMembers}
      />
    </div>
  );
}
