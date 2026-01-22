'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, Trash2, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { withBasePath } from "@/lib/utils";

import TeamMemberManager from "@/components/teams/TeamMemberManager";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Button } from "@/components/ui/button";
import { useTeam, useTeamMembers, useMembers } from "@/lib/hooks";

import type { ApiResponse, GitHubTeam, TeamPrivacy } from "@/lib/types/github";

type TeamResponse = ApiResponse<GitHubTeam>;

export default function TeamDetailsPage() {
  const params = useParams<{ teamSlug: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const teamSlug = params?.teamSlug;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    name: string;
    description: string;
    privacy: TeamPrivacy;
  } | null>(null);

  const {
    data: team,
    isLoading: teamLoading,
    error: teamError,
    refetch: refetchTeam,
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
  const error = teamError || teamMembersError || orgMembersError || actionError;

  // Initialize form state when team data loads
  useEffect(() => {
    if (team && !formState) {
      setFormState({
        name: team.name,
        description: team.description ?? "",
        privacy: team.privacy,
      });
    }
  }, [team, formState]);

  const handleReset = () => {
    if (team) {
      setFormState({
        name: team.name,
        description: team.description ?? "",
        privacy: team.privacy,
      });
    }
    refetchTeam();
  };

  const handleUpdateTeam = async () => {
    if (!teamSlug || !formState) return;

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
      setFormState({
        name: json.data.name,
        description: json.data.description ?? "",
        privacy: json.data.privacy,
      });

      // Invalidate team cache to refetch
      queryClient.invalidateQueries({ queryKey: ["teams", teamSlug] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to update team.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamSlug || !team) return;

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

      // Invalidate teams cache
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      router.push("/teams");
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to delete team.");
    } finally {
      setDeleting(false);
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
    return (
      <ErrorMessage
        message={error instanceof Error ? error.message : error}
        onDismiss={() => setActionError(null)}
      />
    );
  }

  if (!team || !formState) {
    return <ErrorMessage message="Team not found." />;
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
                  setFormState((state) =>
                    state ? { ...state, name: event.target.value } : state
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formState.description}
                onChange={(event) =>
                  setFormState((state) =>
                    state ? { ...state, description: event.target.value } : state
                  )
                }
                placeholder="Team description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Privacy</label>
              <Select
                value={formState.privacy}
                onValueChange={(value) =>
                  setFormState((state) =>
                    state ? { ...state, privacy: value as TeamPrivacy } : state
                  )
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
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleUpdateTeam} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTeam}
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
