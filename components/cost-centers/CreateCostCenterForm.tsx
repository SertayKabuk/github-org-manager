'use client';

import { useState } from "react";
import type { FormEvent } from "react";

import type { CreateCostCenterInput } from "@/lib/types/github";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateCostCenterFormProps {
  onSubmit: (data: CreateCostCenterInput) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
}

export default function CreateCostCenterForm({ onSubmit, onCancel, loading = false }: CreateCostCenterFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Cost center name is required.");
      return;
    }

    setError(null);

    await onSubmit({
      name: name.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <label htmlFor="cost-center-name" className="text-sm font-medium">
          Cost center name
        </label>
        <Input
          id="cost-center-name"
          name="cost-center-name"
          placeholder="e.g. Engineering Team"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
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
          {loading ? "Creating..." : "Create Cost Center"}
        </Button>
      </div>
    </form>
  );
}
