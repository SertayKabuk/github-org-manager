'use client';

import { Plus, Minus } from "lucide-react";
import type { GitHubMember } from "@/lib/types/github";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MemberCardProps {
  member: GitHubMember;
  onClick?: (member: GitHubMember) => void;
  selected?: boolean;
  action?: React.ReactNode;
  className?: string;
  showMobileActions?: boolean;
  onAdd?: (member: GitHubMember) => void;
  onRemove?: (member: GitHubMember) => void;
}

export default function MemberCard({
  member,
  onClick,
  selected = false,
  action,
  className = "",
  showMobileActions = false,
  onAdd,
  onRemove,
}: MemberCardProps) {
  const handleActionClick = (e: React.MouseEvent, actionFn: (member: GitHubMember) => void) => {
    e.stopPropagation();
    actionFn(member);
  };

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
          {showMobileActions && (onAdd || onRemove) && (
            <div className="flex gap-1 md:hidden">
              {onAdd && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => handleActionClick(e, onAdd)}
                  aria-label={`Add ${member.login} to team`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => handleActionClick(e, onRemove)}
                  aria-label={`Remove ${member.login} from team`}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
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
