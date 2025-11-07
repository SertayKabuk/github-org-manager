'use client';

import { GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { GitHubMember } from "@/lib/types/github";

import MemberCard from "@/components/members/MemberCard";

interface DraggableMemberProps {
  member: GitHubMember;
  source: "team" | "available";
  onAdd?: (member: GitHubMember) => void;
  onRemove?: (member: GitHubMember) => void;
}

export default function DraggableMember({
  member,
  source,
  onAdd,
  onRemove,
}: DraggableMemberProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${source}-${member.login}`,
    data: {
      member,
      source,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="relative cursor-grab active:cursor-grabbing group"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
        aria-label="Drag handle indicator"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <MemberCard 
        member={member}
        showMobileActions={true}
        onAdd={source === "available" ? onAdd : undefined}
        onRemove={source === "team" ? onRemove : undefined}
      />
    </div>
  );
}
