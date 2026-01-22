'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

import { withBasePath } from "@/lib/utils";

import CreateTeamForm from "@/components/teams/CreateTeamForm";
import ErrorMessage from "@/components/ui/ErrorMessage";

import type { ApiResponse, CreateTeamInput, GitHubTeam } from "@/lib/types/github";

export default function CreateTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: CreateTeamInput) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(withBasePath("/api/teams"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiResponse<GitHubTeam | null> | null;
        const errorMessage = errorBody?.error ?? `Failed to create team (${response.status}).`;
        throw new Error(errorMessage);
      }

      router.push("/teams");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create team.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Create New Team</h1>
        <p className="text-sm text-zinc-500">Provide team details and save to add it to your organization.</p>
      </div>
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
      <CreateTeamForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/teams")}
        loading={loading}
      />
    </div>
  );
}
