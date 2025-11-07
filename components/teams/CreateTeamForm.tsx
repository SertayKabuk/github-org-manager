'use client';

import { useState } from "react";
import type { FormEvent } from "react";

import type { CreateTeamInput } from "@/lib/types/github";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateTeamFormProps {
  onSubmit: (data: CreateTeamInput) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
}

const PRIVACY_OPTIONS = [
  { label: "Closed (visible to org)", value: "closed" },
  { label: "Secret (invite only)", value: "secret" },
];

export default function CreateTeamForm({ onSubmit, onCancel, loading = false }: CreateTeamFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("closed");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    setError(null);

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      privacy: privacy as CreateTeamInput["privacy"],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <label htmlFor="team-name" className="text-sm font-medium">
          Team name
        </label>
        <Input
          id="team-name"
          name="team-name"
          placeholder="e.g. Platform Team"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="team-description" className="text-sm font-medium">
          Description
        </label>
        <Input
          id="team-description"
          name="team-description"
          placeholder="Describe the team's mission"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="team-privacy" className="text-sm font-medium">
          Privacy
        </label>
        <Select value={privacy} onValueChange={setPrivacy}>
          <SelectTrigger id="team-privacy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="closed">Closed (visible to org)</SelectItem>
            <SelectItem value="secret">Secret (invite only)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          className="sm:w-auto"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="sm:w-auto">
          {loading ? "Creating..." : "Create Team"}
        </Button>
      </div>
    </form>
  );
}
