'use client';

import { useUserTeams } from "@/lib/hooks";
import TeamCard from "@/components/teams/TeamCard";
import { Loading } from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";

export function UserTeamList() {
  const { data: teams, isLoading, error } = useUserTeams();

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error.message} />;
  
  if (!teams || teams.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No teams found. You don't seem to be a member of any teams in this organization.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}
