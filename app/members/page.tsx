'use client';

import { useMemo, useState } from "react";
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
import { useMembers, useTeams, useCostCenters, type MemberRole } from "@/lib/hooks";

const ROLE_OPTIONS = [
  { label: "All members", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Members", value: "member" },
];

export default function MembersPage() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [roleFilter, setRoleFilter] = useState<MemberRole>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [costCenterFilter, setCostCenterFilter] = useState<string>("all");

  // Fetch teams for the filter dropdown
  const { data: teams = [] } = useTeams();
  
  // Fetch active cost centers
  const { data: costCenters = [] } = useCostCenters({ state: "active" });

  // Fetch members with filters
  // For "none" team filter, we fetch all members and filter client-side
  const {
    data: fetchedMembers = [],
    isLoading: loading,
    error,
  } = useMembers({
    role: roleFilter,
    team: teamFilter !== "all" && teamFilter !== "none" ? teamFilter : undefined,
  });

  // Build a set of member logins that have cost centers (User resources)
  const membersWithCostCenter = useMemo(() => {
    const logins = new Set<string>();
    costCenters.forEach((cc) => {
      cc.resources.forEach((resource) => {
        if (resource.type === "User") {
          logins.add(resource.name);
        }
      });
    });
    return logins;
  }, [costCenters]);

  // If filtering for "no team" or "no cost center", filter client-side
  const members = useMemo(() => {
    let filtered = fetchedMembers;
    
    // Filter by team
    if (teamFilter === "none") {
      filtered = filtered.filter(
        (member) => !member.teams || member.teams.length === 0
      );
    }
    
    // Filter by cost center
    if (costCenterFilter === "none") {
      filtered = filtered.filter(
        (member) => !membersWithCostCenter.has(member.login)
      );
    }
    
    return filtered;
  }, [fetchedMembers, teamFilter, costCenterFilter, membersWithCostCenter]);

  const memberCount = members.length;

  const filterLabel = useMemo(() => {
    if (teamFilter === "none") {
      return "without team";
    }
    if (costCenterFilter === "none") {
      return "without cost center";
    }
    if (teamFilter !== "all") {
      const selectedTeam = teams.find((t) => t.slug === teamFilter);
      return selectedTeam ? `${selectedTeam.name} team` : "filtered";
    }
    if (roleFilter === "all") return "total";
    return roleFilter;
  }, [roleFilter, teamFilter, costCenterFilter, teams]);

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
          <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by cost center" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cost centers</SelectItem>
              <SelectItem value="none">No cost center</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as MemberRole)}>
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
        <ErrorMessage message={error.message} />
      ) : (
        <MemberList members={members} />
      )}
    </div>
  );
}
