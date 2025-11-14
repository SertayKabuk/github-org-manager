'use client';

import { useEffect, useMemo, useState } from "react";
import { Users, Filter, LogIn } from "lucide-react";

import MemberList from "@/components/members/MemberList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useAuth } from "@/components/auth/AuthProvider";

import type { ApiResponse, GitHubMember, GitHubTeam } from "@/lib/types/github";

type RoleFilter = "all" | "admin" | "member";

const ROLE_OPTIONS = [
  { label: "All members", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Members", value: "member" },
];

export default function MembersPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [members, setMembers] = useState<GitHubMember[]>([]);
  const [teams, setTeams] = useState<GitHubTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch teams for the filter dropdown
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isMounted = true;

    const fetchTeams = async () => {
      try {
        const response = await fetch("/api/teams");
        if (!response.ok) {
          throw new Error(`Failed to fetch teams (${response.status})`);
        }
        const json = (await response.json()) as ApiResponse<GitHubTeam[]>;
        if (!isMounted) return;
        setTeams(json.data);
      } catch (err) {
        console.error("Error fetching teams:", err);
        // Don't set error here, teams filter is optional
      }
    };

    fetchTeams();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMembers = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (roleFilter !== "all") {
          params.append("role", roleFilter);
        }
        // Only add team filter to API if it's not "all" or "none"
        // For "none", we'll fetch all members and filter client-side
        if (teamFilter !== "all" && teamFilter !== "none") {
          params.append("team", teamFilter);
        }

        const queryString = params.toString();
        const url = `/api/members${queryString ? `?${queryString}` : ""}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch members (${response.status})`);
        }
        const json = (await response.json()) as ApiResponse<GitHubMember[]>;
        if (!isMounted) return;
        
        // If filtering for "no team", filter client-side
        if (teamFilter === "none") {
          const membersWithNoTeam = json.data.filter(
            (member) => !member.teams || member.teams.length === 0
          );
          setMembers(membersWithNoTeam);
        } else {
          setMembers(json.data);
        }
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load members.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMembers();

    return () => {
      isMounted = false;
    };
  }, [roleFilter, teamFilter, isAuthenticated]);

  const memberCount = useMemo(() => members.length, [members]);

  const filterLabel = useMemo(() => {
    if (teamFilter === "none") {
      return "without team";
    }
    if (teamFilter !== "all") {
      const selectedTeam = teams.find((t) => t.slug === teamFilter);
      return selectedTeam ? `${selectedTeam.name} team` : "filtered";
    }
    if (roleFilter === "all") return "total";
    return roleFilter;
  }, [roleFilter, teamFilter, teams]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please sign in with your GitHub account to view organization members.
        </p>
        <Button onClick={() => login()} size="lg">
          <LogIn className="mr-2 h-5 w-5" />
          Login with GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Members</h1>
          <p className="text-muted-foreground mt-2">
            Browse and filter every member in the organization.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              <SelectItem value="none">No team</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.slug}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary" className="text-xs">
          {memberCount} {filterLabel} {memberCount === 1 ? 'member' : 'members'}
        </Badge>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : error ? (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      ) : (
        <MemberList members={members} />
      )}
    </div>
  );
}
