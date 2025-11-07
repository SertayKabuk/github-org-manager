'use client';

import type { GitHubMember } from "@/lib/types/github";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface MemberCardProps {
  member: GitHubMember;
  onClick?: (member: GitHubMember) => void;
  selected?: boolean;
  action?: React.ReactNode;
  className?: string;
}

export default function MemberCard({
  member,
  onClick,
  selected = false,
  action,
  className = "",
}: MemberCardProps) {
  return (
    <Card
      onClick={onClick ? () => onClick(member) : undefined}
      className={[
        "transition-all hover:shadow-md",
        selected ? "ring-2 ring-primary" : "",
        onClick ? "cursor-pointer" : "cursor-default",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CardContent className="flex flex-col gap-2 px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={member.avatar_url} alt={`${member.login} avatar`} />
            <AvatarFallback className="text-[10px]">{member.login.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{member.login}</p>
            {member.name && (
              <p className="text-xs text-muted-foreground truncate">{member.name}</p>
            )}
          </div>
          {member.role && (
            <Badge variant="secondary" className="capitalize text-xs h-5">
              {member.role}
            </Badge>
          )}
          {action && <div>{action}</div>}
        </div>
        {member.teams && member.teams.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {member.teams.map((team) => (
              <Badge key={team.id} variant="outline" className="text-[10px] h-4 px-1.5">
                {team.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
