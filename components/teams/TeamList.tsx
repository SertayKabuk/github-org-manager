'use client';

import { Layers } from "lucide-react";
import type { GitHubTeam } from "@/lib/types/github";

import ErrorMessage from "@/components/ui/ErrorMessage";
import TeamCard from "@/components/teams/TeamCard";

interface TeamListProps {
  teams: GitHubTeam[];
  error?: string;
  onTeamClick?: (team: GitHubTeam) => void;
  onDeleteTeam?: (team: GitHubTeam) => void;
}

export default function TeamList({
  teams,
  error,
  onTeamClick,
  onDeleteTeam,
}: TeamListProps) {
  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          No teams found. Create your first team to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          onClick={onTeamClick}
          onDelete={onDeleteTeam}
        />
      ))}
    </div>
  );
}
