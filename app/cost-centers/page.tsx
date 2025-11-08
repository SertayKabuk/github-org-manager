'use client';

import { useEffect, useState, useMemo } from "react";
import { Plus, Filter } from "lucide-react";

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

import type { ApiResponse, CostCenter, CreateCostCenterInput, CostCenterState } from "@/lib/types/github";

interface CostCentersResponse extends ApiResponse<CostCenter[]> {}
interface CostCenterResponse extends ApiResponse<CostCenter> {}

type StateFilter = "all" | CostCenterState;

export default function CostCentersPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [stateFilter, setStateFilter] = useState<StateFilter>("active");

  const loadCostCenters = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cost-centers");

      if (!response.ok) {
        throw new Error(`Failed to load cost centers (${response.status})`);
      }

      const json = (await response.json()) as CostCentersResponse;
      setCostCenters(json.data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load cost centers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCostCenters();
  }, []);

  const handleCreateCostCenter = async (data: CreateCostCenterInput) => {
    setCreating(true);
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

      const json = (await response.json()) as CostCenterResponse;
      setCostCenters((prev) => [...prev, json.data]);
      setShowCreateForm(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create cost center.");
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

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

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
