'use client';

import { useCallback, useMemo, useState } from "react";
import { Users, Filter } from "lucide-react";

import { withBasePath } from "@/lib/utils";
import type { GitHubMember } from "@/lib/types/github";
import MemberList from "@/components/members/MemberList";
import BulkActionToolbar from "@/components/members/BulkActionToolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { useMembers, useTeams, useCostCenters, type MemberRole } from "@/lib/hooks";

const ROLE_OPTIONS = [
  { label: "All members", value: "all" },
  { label: "Admins", value: "admin" },
  { label: "Members", value: "member" },
];

export default function MembersPage() {
  const [roleFilter, setRoleFilter] = useState<MemberRole>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [costCenterFilter, setCostCenterFilter] = useState<string>("all");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // Fetch teams for the filter dropdown
  const { data: teams = [] } = useTeams();

  // Fetch active cost centers
  const { data: costCenters = [], refetch: refetchCostCenters } = useCostCenters({ state: "active" });

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

  // Show bulk actions when filtering for "no cost center" or "no team"
  const showBulkActions = costCenterFilter === "none" || teamFilter === "none";

  // Handle member selection
  const handleSelectionChange = useCallback((member: GitHubMember, selected: boolean) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(member.login);
      } else {
        next.delete(member.login);
      }
      return next;
    });
  }, []);

  // Select all visible members
  const handleSelectAll = useCallback(() => {
    setSelectedMembers(new Set(members.map((m) => m.login)));
  }, [members]);

  // Deselect all members
  const handleDeselectAll = useCallback(() => {
    setSelectedMembers(new Set());
  }, []);

  // Add selected members to a cost center
  const handleAddToCostCenter = useCallback(async (costCenterId: string) => {
    const users = Array.from(selectedMembers);
    if (users.length === 0) return;

    const response = await fetch(withBasePath(`/api/cost-centers/${costCenterId}/resource`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to add members to cost center");
    }

    // Clear selection and refresh cost centers data
    setSelectedMembers(new Set());
    refetchCostCenters();
  }, [selectedMembers, refetchCostCenters]);

  // Add selected members to a team
  const handleAddToTeam = useCallback(async (teamSlug: string) => {
    const usernames = Array.from(selectedMembers);
    if (usernames.length === 0) return;

    const response = await fetch(withBasePath(`/api/teams/${teamSlug}/members`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to add members to team");
    }

    // Clear selection and refresh members data
    setSelectedMembers(new Set());
    // We could refetch more selectively, but for now we refresh the active members list
    // which effectively removes them from the "No team" view if they were there
  }, [selectedMembers]);


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

      {showBulkActions && !loading && memberCount > 0 && (
        <BulkActionToolbar
          selectedCount={selectedMembers.size}
          totalCount={memberCount}
          costCenters={costCenterFilter === "none" ? costCenters : []}
          teams={teamFilter === "none" ? teams : []}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onAddToCostCenter={costCenterFilter === "none" ? handleAddToCostCenter : undefined}
          onAddToTeam={teamFilter === "none" ? handleAddToTeam : undefined}
        />
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : error ? (
        <ErrorMessage message={error.message} />
      ) : (
        <MemberList
          members={members}
          selectable={showBulkActions}
          selectedMembers={selectedMembers}
          onSelectionChange={handleSelectionChange}
        />
      )}
    </div>
  );
}
