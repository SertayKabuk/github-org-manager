'use client';

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

import type { GitHubMember } from "@/lib/types/github";

import ErrorMessage from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import MemberCard from "@/components/members/MemberCard";

interface MemberListProps {
  members: GitHubMember[];
  error?: string;
  onMemberClick?: (member: GitHubMember) => void;
  selectable?: boolean;
  selectedMembers?: Set<string>;
  onSelectionChange?: (member: GitHubMember, selected: boolean) => void;
}

export default function MemberList({
  members,
  error,
  onMemberClick,
  selectable = false,
  selectedMembers,
  onSelectionChange,
}: MemberListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return members;
    }
    return members.filter((member) => {
      const loginMatch = member.login.toLowerCase().includes(term);
      const nameMatch = member.name?.toLowerCase().includes(term) ?? false;
      return loginMatch || nameMatch;
    });
  }, [members, searchTerm]);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by username or name"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-9"
        />
      </div>
      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground">
            No members found.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={onMemberClick}
              selectable={selectable}
              selected={selectedMembers?.has(member.login)}
              onSelectionChange={onSelectionChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
