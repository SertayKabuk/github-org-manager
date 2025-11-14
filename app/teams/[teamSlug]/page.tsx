'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Save, Trash2, RotateCcw } from "lucide-react";

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

import type { ApiResponse, GitHubMember, GitHubTeam, TeamPrivacy } from "@/lib/types/github";

type TeamResponse = ApiResponse<GitHubTeam>;
type MembersResponse = ApiResponse<GitHubMember[]>;

export default function TeamDetailsPage() {
  const params = useParams<{ teamSlug: string }>();
  const router = useRouter();
  const teamSlug = params?.teamSlug;

  const [team, setTeam] = useState<GitHubTeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<GitHubMember[]>([]);
  const [orgMembers, setOrgMembers] = useState<GitHubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formState, setFormState] = useState<{
    name: string;
    description: string;
    privacy: TeamPrivacy;
  } | null>(null);

  const loadTeamData = useCallback(async () => {
    if (!teamSlug) return;

    setLoading(true);
    setError(null);

    try {
      const [teamResponse, teamMembersResponse, membersResponse] = await Promise.all([
        fetch(`/api/teams/${teamSlug}`),
        fetch(`/api/teams/${teamSlug}/members`),
        fetch(`/api/members`),
      ]);

      if (!teamResponse.ok) {
        throw new Error(`Failed to load team (${teamResponse.status})`);
      }

      const teamJson = (await teamResponse.json()) as TeamResponse;

      if (!teamMembersResponse.ok) {
        throw new Error(`Failed to load team members (${teamMembersResponse.status})`);
      }
      const teamMembersJson = (await teamMembersResponse.json()) as MembersResponse;

      if (!membersResponse.ok) {
        throw new Error(`Failed to load organization members (${membersResponse.status})`);
      }
      const membersJson = (await membersResponse.json()) as MembersResponse;

      setTeam(teamJson.data);
      setTeamMembers(teamMembersJson.data);
      setOrgMembers(membersJson.data);
      setFormState({
        name: teamJson.data.name,
        description: teamJson.data.description ?? "",
        privacy: teamJson.data.privacy,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load team data.");
    } finally {
      setLoading(false);
    }
  }, [teamSlug]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const handleUpdateTeam = async () => {
    if (!teamSlug || !formState) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamSlug}`, {
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
      setTeam(json.data);
      setFormState({
        name: json.data.name,
        description: json.data.description ?? "",
        privacy: json.data.privacy,
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update team.");
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
    try {
      const response = await fetch(`/api/teams/${teamSlug}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const json = (await response.json().catch(() => null)) as TeamResponse | null;
        throw new Error(json?.error ?? `Failed to delete team (${response.status})`);
      }
      router.push("/teams");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete team.");
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
    return <ErrorMessage message={error} onDismiss={() => setError(null)} />;
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
              onClick={loadTeamData}
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
