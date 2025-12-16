'use client';

import { useState, useMemo } from "react";
import { Plus, Filter } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import CostCenterList from "@/components/cost-centers/CostCenterList";
import CreateCostCenterForm from "@/components/cost-centers/CreateCostCenterForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCostCenters } from "@/lib/hooks";

import type { ApiResponse, CostCenter, CreateCostCenterInput, CostCenterState } from "@/lib/types/github";

type CostCenterResponse = ApiResponse<CostCenter>;

type StateFilter = "all" | CostCenterState;

export default function CostCentersPage() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [stateFilter, setStateFilter] = useState<StateFilter>("active");

  // Fetch all cost centers (we filter client-side based on stateFilter)
  const {
    data: costCenters = [],
    isLoading: loading,
    error: fetchError,
  } = useCostCenters();

  const error = fetchError || actionError;

  const handleCreateCostCenter = async (data: CreateCostCenterInput) => {
    setCreating(true);
    setActionError(null);
    try {
      const response = await fetch("/api/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as CostCenterResponse | null;
        throw new Error(json?.error ?? `Failed to create cost center (${response.status})`);
      }

      // Invalidate cost centers cache
      queryClient.invalidateQueries({ queryKey: ["cost-centers"] });
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to create cost center.");
    } finally {
      setCreating(false);
    }
  };

  // Filter cost centers based on selected state
  const filteredCostCenters = useMemo(() => {
    if (stateFilter === "all") {
      return costCenters;
    }
    return costCenters.filter((cc) => cc.state === stateFilter);
  }, [costCenters, stateFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Centers</h1>
          <p className="text-muted-foreground mt-2">
            Manage billing cost centers and their associated resources.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Cost Center
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by state:</span>
        </div>
        <Select value={stateFilter} onValueChange={(value) => setStateFilter(value as StateFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          Showing {filteredCostCenters.length} of {costCenters.length} cost centers
        </span>
      </div>

      {error && (
        <ErrorMessage
          message={error instanceof Error ? error.message : error}
          onDismiss={() => setActionError(null)}
        />
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Cost Center</CardTitle>
            <CardDescription>Create a new cost center for billing management</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateCostCenterForm
              onSubmit={handleCreateCostCenter}
              onCancel={() => setShowCreateForm(false)}
              loading={creating}
            />
          </CardContent>
        </Card>
      )}

      <CostCenterList costCenters={filteredCostCenters} />
    </div>
  );
}
