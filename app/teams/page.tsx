'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, LogIn, Layers } from "lucide-react";

import TeamList from "@/components/teams/TeamList";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useAuth } from "@/components/auth/AuthProvider";

import type { GitHubTeam } from "@/lib/types/github";

interface TeamsResponse {
  data: GitHubTeam[];
  error?: string;
}

export default function TeamsPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [teams, setTeams] = useState<GitHubTeam[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/teams");
      if (!response.ok) {
        throw new Error(`Failed to fetch teams (${response.status})`);
      }
      const json = (await response.json()) as TeamsResponse;
      setTeams(json.data);
      setError(json.error ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

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

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Layers className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please sign in with your GitHub account to view and manage teams.
        </p>
        <Button onClick={() => login()} size="lg">
          <LogIn className="mr-2 h-5 w-5" />
          Login with GitHub
        </Button>
      </div>
    );
  }

  const handleDeleteTeam = async (team: GitHubTeam) => {
    const confirmed = window.confirm(`Delete team "${team.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${team.slug}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        throw new Error(await response.text());
      }

      setTeams((prev) => prev.filter((item) => item.id !== team.id));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete team.");
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
          <Link href="/teams/new">
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
      ) : error ? (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      ) : (
        <TeamList
          teams={filteredTeams}
          onTeamClick={(team) => router.push(`/teams/${team.slug}`)}
          onDeleteTeam={handleDeleteTeam}
        />
      )}
    </div>
  );
}
