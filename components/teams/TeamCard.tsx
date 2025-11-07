'use client';

import type { MouseEvent } from "react";
import { Layers, Users, GitFork, Shield, Lock } from "lucide-react";

import type { GitHubTeam } from "@/lib/types/github";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TeamCardProps {
  team: GitHubTeam;
  onClick?: (team: GitHubTeam) => void;
  onDelete?: (team: GitHubTeam) => void;
  disableDelete?: boolean;
}

export default function TeamCard({ team, onClick, onDelete, disableDelete = false }: TeamCardProps) {
  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete?.(team);
  };

  return (
    <Card
      onClick={onClick ? () => onClick(team) : undefined}
      className={[
        "flex h-full cursor-pointer flex-col transition-all hover:shadow-lg",
        onClick ? "" : "cursor-default",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{team.name}</CardTitle>
          </div>
          <Badge variant={team.privacy === "secret" ? "destructive" : "secondary"} className="capitalize">
            {team.privacy === "secret" ? (
              <><Lock className="mr-1 h-3 w-3" />{team.privacy}</>
            ) : (
              <><Shield className="mr-1 h-3 w-3" />{team.privacy}</>
            )}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {team.description || "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{team.members_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <GitFork className="h-4 w-4" />
            <span>{team.repos_count}</span>
          </div>
        </div>
      </CardContent>
      {onDelete && (
        <CardFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={disableDelete}
            className="w-full"
          >
            Delete Team
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
