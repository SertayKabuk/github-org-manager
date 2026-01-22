'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { withBasePath } from "@/lib/utils";
import TeamList from "@/components/teams/TeamList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useTeams } from "@/lib/hooks";

import type { GitHubTeam } from "@/lib/types/github";

export default function TeamsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: teams = [],
    isLoading: loading,
    error,
  } = useTeams();

  const filteredTeams = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      return teams;
    }
    return teams.filter((team) =>
      [team.name, team.slug, team.description ?? ""].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  }, [teams, searchQuery]);


  const handleDeleteTeam = async (team: GitHubTeam) => {
    const confirmed = window.confirm(`Delete team "${team.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(withBasePath(`/api/teams/${team.slug}`), { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        throw new Error(await response.text());
      }

      // Invalidate the teams cache to refetch
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    } catch (err) {
      console.error(err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete team.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-2">
            Browse and manage teams in your organization.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/teams/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter by name or description"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : error || deleteError ? (
        <ErrorMessage
          message={error?.message || deleteError || "An error occurred"}
          onDismiss={() => setDeleteError(null)}
        />
      ) : (
        <TeamList
          teams={filteredTeams}
          onTeamClick={(team) => router.push(`/admin/teams/${team.slug}`)}
          onDeleteTeam={handleDeleteTeam}
        />
      )}
    </div>
  );
}
