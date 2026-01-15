'use client';

import { useState } from "react";
import { CheckSquare, Square, X, Loader2 } from "lucide-react";

import type { CostCenter, GitHubTeam } from "@/lib/types/github";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  costCenters?: CostCenter[];
  teams?: GitHubTeam[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddToCostCenter?: (costCenterId: string) => Promise<void>;
  onAddToTeam?: (teamSlug: string) => Promise<void>;
}

export default function BulkActionToolbar({
  selectedCount,
  totalCount,
  costCenters = [],
  teams = [],
  onSelectAll,
  onDeselectAll,
  onAddToCostCenter,
  onAddToTeam,
}: BulkActionToolbarProps) {
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddToCostCenter = async () => {
    if (!selectedCostCenter || selectedCount === 0 || !onAddToCostCenter) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await onAddToCostCenter(selectedCostCenter);
      const costCenterName = costCenters.find(cc => cc.id === selectedCostCenter)?.name;
      setSuccess(`Successfully added ${selectedCount} member${selectedCount > 1 ? 's' : ''} to ${costCenterName}`);
      setSelectedCostCenter("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add members to cost center");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToTeam = async () => {
    if (!selectedTeam || selectedCount === 0 || !onAddToTeam) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await onAddToTeam(selectedTeam);
      const teamName = teams.find(t => t.slug === selectedTeam)?.name;
      setSuccess(`Successfully added ${selectedCount} member${selectedCount > 1 ? 's' : ''} to ${teamName}`);
      setSelectedTeam("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add members to team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="h-8"
          >
            {allSelected ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                Deselect all
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-1" />
                Select all
              </>
            )}
          </Button>
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="h-6 w-px bg-border" />

        <span className="text-sm text-muted-foreground">
          {selectedCount} of {totalCount} selected
        </span>

        {selectedCount > 0 && (
          <>
            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2 flex-wrap">
              {onAddToCostCenter && costCenters.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Select cost center" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={handleAddToCostCenter}
                    disabled={!selectedCostCenter || isSubmitting}
                    className="h-8"
                  >
                    {isSubmitting && selectedCostCenter ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add to cost center"
                    )}
                  </Button>
                </div>
              )}

              {onAddToTeam && teams.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.slug}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={handleAddToTeam}
                    disabled={!selectedTeam || isSubmitting}
                    className="h-8"
                  >
                    {isSubmitting && selectedTeam ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add to team"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            {success}
            <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
