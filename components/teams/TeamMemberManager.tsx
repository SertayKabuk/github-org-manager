'use client';

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, UserMinus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

import { withBasePath } from "@/lib/utils";

import type { GitHubMember } from "@/lib/types/github";

import DraggableMember from "@/components/members/DraggableMember";
import MemberCard from "@/components/members/MemberCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TeamMemberManagerProps {
  teamSlug: string;
  initialTeamMembers: GitHubMember[];
  initialOrgMembers: GitHubMember[];
}

type Feedback = { type: "success" | "error"; text: string } | null;

type DragSource = "team" | "available";

function sanitizeMembers(members: GitHubMember[]): GitHubMember[] {
  const seen = new Set<string>();
  return members.filter((member) => {
    if (seen.has(member.login)) {
      return false;
    }
    seen.add(member.login);
    return true;
  });
}

function DroppableZone({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="h-full">
      {children}
    </div>
  );
}

export default function TeamMemberManager({
  teamSlug,
  initialTeamMembers,
  initialOrgMembers,
}: TeamMemberManagerProps) {
  const [teamMembers, setTeamMembers] = useState<GitHubMember[]>(() =>
    sanitizeMembers(initialTeamMembers)
  );
  const [availableMembers, setAvailableMembers] = useState<GitHubMember[]>(() => {
    const teamLogins = new Set(initialTeamMembers.map((member) => member.login));
    return sanitizeMembers(
      initialOrgMembers.filter((member) => !teamLogins.has(member.login))
    );
  });
  useEffect(() => {
    setTeamMembers(sanitizeMembers(initialTeamMembers));
  }, [initialTeamMembers]);

  useEffect(() => {
    const teamLogins = new Set(initialTeamMembers.map((member) => member.login));
    setAvailableMembers(
      sanitizeMembers(
        initialOrgMembers.filter((member) => !teamLogins.has(member.login))
      )
    );
  }, [initialOrgMembers, initialTeamMembers]);
  const [teamSearch, setTeamSearch] = useState("");
  const [availableSearch, setAvailableSearch] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [dragOverTarget, setDragOverTarget] = useState<DragSource | null>(null);
  const [pendingMemberLogin, setPendingMemberLogin] = useState<string | null>(null);
  const [activeDragMember, setActiveDragMember] = useState<GitHubMember | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 10,
      },
    })
  );

  const filteredTeamMembers = useMemo(() => {
    const term = teamSearch.trim().toLowerCase();
    if (!term) return teamMembers;
    return teamMembers.filter((member) =>
      [member.login, member.name ?? ""].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  }, [teamMembers, teamSearch]);

  const filteredAvailableMembers = useMemo(() => {
    const term = availableSearch.trim().toLowerCase();
    if (!term) return availableMembers;
    return availableMembers.filter((member) =>
      [member.login, member.name ?? ""].some((value) =>
        value.toLowerCase().includes(term)
      )
    );
  }, [availableMembers, availableSearch]);

  const addMemberToTeam = async (member: GitHubMember) => {
    if (teamMembers.some((existing) => existing.login === member.login)) {
      return;
    }

    setPendingMemberLogin(member.login);
    const previousTeam = teamMembers;
    const previousAvailable = availableMembers;

    const updatedMember: GitHubMember = { ...member, role: "member" };

    setTeamMembers((members) => [...members, updatedMember]);
    setAvailableMembers((members) => members.filter((item) => item.login !== member.login));

    try {
      const response = await fetch(withBasePath(`/api/teams/${teamSlug}/members`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: member.login, role: "member" }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { data } = (await response.json()) as { data: GitHubMember };
      setTeamMembers((members) =>
        members.map((item) =>
          item.login === member.login ? { ...item, role: data.role ?? item.role } : item
        )
      );
      setFeedback({ type: "success", text: `${member.login} added to the team.` });
    } catch (error) {
      console.error(error);
      setTeamMembers(previousTeam);
      setAvailableMembers(previousAvailable);
      setFeedback({
        type: "error",
        text: `Could not add ${member.login}. ${error instanceof Error ? error.message : ""}`.trim(),
      });
    } finally {
      setPendingMemberLogin(null);
    }
  };

  const removeMemberFromTeam = async (member: GitHubMember) => {
    if (!teamMembers.some((existing) => existing.login === member.login)) {
      return;
    }

    setPendingMemberLogin(member.login);
    const previousTeam = teamMembers;
    const previousAvailable = availableMembers;

    setTeamMembers((members) => members.filter((item) => item.login !== member.login));
    setAvailableMembers((members) => [{ ...member, role: undefined }, ...members]);

    try {
      const response = await fetch(withBasePath(`/api/teams/${teamSlug}/members?username=${member.login}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(await response.text());
      }

      setFeedback({ type: "success", text: `${member.login} removed from the team.` });
    } catch (error) {
      console.error(error);
      setTeamMembers(previousTeam);
      setAvailableMembers(previousAvailable);
      setFeedback({
        type: "error",
        text: `Could not remove ${member.login}. ${error instanceof Error ? error.message : ""}`.trim(),
      });
    } finally {
      setPendingMemberLogin(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { member: GitHubMember; source: DragSource } | undefined;
    if (data?.member) {
      setActiveDragMember(data.member);
      setPendingMemberLogin(data.member.login);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragMember(null);
    setPendingMemberLogin(null);
    setDragOverTarget(null);

    if (!over) return;

    const activeData = active.data.current as { member: GitHubMember; source: DragSource } | undefined;
    if (!activeData?.member) return;

    const { member, source } = activeData;
    const targetZone = over.id as DragSource;

    if (source === targetZone) return;

    if (targetZone === "team") {
      addMemberToTeam(member);
    } else if (targetZone === "available") {
      removeMemberFromTeam(member);
    }
  };

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    if (event.over) {
      setDragOverTarget(event.over.id as DragSource);
    } else {
      setDragOverTarget(null);
    }
  };

  const renderFeedback = () => {
    if (!feedback) return null;

    if (feedback.type === "success") {
      return (
        <Alert className="border-green-500 bg-green-100 dark:bg-green-950 dark:border-green-800">
          <AlertDescription className="flex items-center justify-between text-green-900 dark:text-green-100">
            <span className="font-medium">✓ {feedback.text}</span>
            <button
              type="button"
              aria-label="Dismiss success message"
              onClick={() => setFeedback(null)}
              className="rounded-full p-1 transition hover:bg-green-200 dark:hover:bg-green-900"
            >
              ✕
            </button>
          </AlertDescription>
        </Alert>
      );
    }

    return <ErrorMessage message={feedback.text} onDismiss={() => setFeedback(null)} />;
  };

  return (
    <section className="space-y-6">
      {renderFeedback()}
      <Alert className="md:hidden">
        <AlertDescription className="text-sm">
          <strong>💡 Mobile tip:</strong> Use the <strong>+</strong> and <strong>−</strong> buttons on each card for quick actions. You can also press and hold to drag.
        </AlertDescription>
      </Alert>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        modifiers={[restrictToWindowEdges]}
        autoScroll={{ interval: 5, acceleration: 10 }}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <DroppableZone id="team">
            <Card
              className={[
                "min-h-[300px] md:min-h-[400px] transition-colors",
                dragOverTarget === "team" ? "border-primary bg-primary/5" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <CardTitle>Team Members</CardTitle>
                </div>
                <CardDescription>Drag members here to add them to the team.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter by username"
                    value={teamSearch}
                    onChange={(event) => setTeamSearch(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[50vh] md:max-h-[600px] overflow-y-auto overscroll-contain space-y-2 -mx-2 px-2 scroll-smooth">
                  {filteredTeamMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                      <UserPlus className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No members in this team yet. Drag a member from the right to add them.
                      </p>
                    </div>
                  ) : (
                    filteredTeamMembers.map((member) => (
                      <DraggableMember
                        key={member.login}
                        member={member}
                        source="team"
                        onRemove={removeMemberFromTeam}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </DroppableZone>

          <DroppableZone id="available">
            <Card
              className={[
                "min-h-[300px] md:min-h-[400px] transition-colors",
                dragOverTarget === "available" ? "border-destructive bg-destructive/5" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserMinus className="h-5 w-5 text-destructive" />
                  <CardTitle>Available Members</CardTitle>
                </div>
                <CardDescription>Drag members here to remove them from the team.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter by username"
                    value={availableSearch}
                    onChange={(event) => setAvailableSearch(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[50vh] md:max-h-[600px] overflow-y-auto overscroll-contain space-y-2 -mx-2 px-2 scroll-smooth">
                  {filteredAvailableMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                      <UserMinus className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Everyone is already in this team or no members match your search.
                      </p>
                    </div>
                  ) : (
                    filteredAvailableMembers.map((member) => (
                      <DraggableMember
                        key={member.login}
                        member={member}
                        source="available"
                        onAdd={addMemberToTeam}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </DroppableZone>
        </div>
        <DragOverlay>
          {activeDragMember ? <MemberCard member={activeDragMember} /> : null}
        </DragOverlay>
      </DndContext>
      {pendingMemberLogin && (
        <p className="text-sm text-muted-foreground">Processing changes for {pendingMemberLogin}...</p>
      )}
    </section>
  );
}
