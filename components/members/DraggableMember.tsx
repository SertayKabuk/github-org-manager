'use client';

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { GitHubMember } from "@/lib/types/github";

import MemberCard from "@/components/members/MemberCard";

interface DraggableMemberProps {
  member: GitHubMember;
  source: "team" | "available";
}

export default function DraggableMember({
  member,
  source,
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
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <MemberCard member={member} />
    </div>
  );
}
