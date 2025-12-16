'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Plus, RefreshCcw } from "lucide-react";

import BudgetList from "@/components/budgets/BudgetList";
import CreateBudgetForm from "@/components/budgets/CreateBudgetForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiResponse, Budget, BudgetCreateResult, BudgetDeleteResult, CreateBudgetInput, BudgetScope } from "@/lib/types/github";

type BudgetsResponse = ApiResponse<Budget[]>;
type BudgetCreationResponse = ApiResponse<BudgetCreateResult>;
type BudgetDeleteResponse = ApiResponse<BudgetDeleteResult>;

type ScopeFilter = "all" | BudgetScope;

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<Record<string, number>>({});

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/budgets", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load budgets (${response.status})`);
      }

      const json = (await response.json()) as BudgetsResponse;
      setBudgets(json.data);
      
      // Fetch usage data for cost center budgets
      await loadUsageData(json.data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load budgets.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsageData = async (budgetList: Budget[]) => {
    const costCenterBudgets = budgetList.filter(
      (budget) => budget.budget_scope === "cost_center" && budget.budget_entity_name
    );

    if (costCenterBudgets.length === 0) return;

    const usagePromises = costCenterBudgets.map(async (budget) => {
      try {
        const response = await fetch(
          `/api/billing-usage?costCenterId=${encodeURIComponent(budget.budget_entity_name!)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          console.warn(`Failed to fetch usage for ${budget.budget_entity_name}`);
          return { budgetId: budget.id, spent: 0 };
        }

        const json = await response.json();
        const usageItems = json.data?.usageItems || [];
        
        // Sum up netAmount from all usage items for this cost center
        const totalSpent = usageItems.reduce(
          (sum: number, item: { netAmount?: number }) => sum + (item.netAmount || 0),
          0
        );

        return { budgetId: budget.id, spent: totalSpent };
      } catch (err) {
        console.error(`Error fetching usage for ${budget.budget_entity_name}:`, err);
        return { budgetId: budget.id, spent: 0 };
      }
    });

    const results = await Promise.all(usagePromises);
    const usageMap = results.reduce(
      (acc, { budgetId, spent }) => {
        acc[budgetId] = spent;
        return acc;
      },
      {} as Record<string, number>
    );

    setUsageData(usageMap);
  };

  const handleDeleteRequest = (budget: Budget) => {
    setSelectedBudget(budget);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deletingBudgetId) return;
    setDeleteDialogOpen(false);
    setSelectedBudget(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBudget) return;
    setDeletingBudgetId(selectedBudget.id);

    try {
      const response = await fetch(`/api/budgets/${selectedBudget.id}`, {
        method: "DELETE",
      });

      const json = (await response.json().catch(() => null)) as BudgetDeleteResponse | null;

      if (!response.ok) {
        throw new Error(json?.data.message ?? `Failed to delete budget (${response.status})`);
      }

      setBudgets((prev) => prev.filter((budget) => budget.id !== selectedBudget.id));
      setError(null);
      setDeleteDialogOpen(false);
      setSelectedBudget(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete budget.");
    } finally {
      setDeletingBudgetId(null);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleCreateBudget = async (data: CreateBudgetInput) => {
    setCreating(true);

    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = (await response.json().catch(() => null)) as BudgetCreationResponse | null;

      if (!response.ok) {
        throw new Error(json?.data.message ?? `Failed to create budget (${response.status})`);
      }

      setShowCreateForm(false);
      await loadBudgets();
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create budget.");
    } finally {
      setCreating(false);
    }
  };

  const filteredBudgets = useMemo(() => {
    if (scopeFilter === "all") return budgets;
    return budgets.filter((budget) => budget.budget_scope === scopeFilter);
  }, [budgets, scopeFilter]);

  const stats = useMemo(() => {
    const total = budgets.length;
    const totalAmount = budgets.reduce((sum, budget) => sum + (budget.budget_amount ?? 0), 0);
    const guarded = budgets.filter((budget) => budget.prevent_further_usage).length;

    return {
      total,
      totalAmount,
      guarded,
    };
  }, [budgets]);

  const isInitialLoading = loading && budgets.length === 0;

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and create spending limits across your enterprise resources.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadBudgets} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm((value) => !value)}>
            <Plus className="mr-2 h-4 w-4" />
            New Budget
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total budgets</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Aggregate limit</CardDescription>
            <CardTitle className="text-3xl">
              {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(stats.totalAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Guard rails enabled</CardDescription>
            <CardTitle className="text-3xl">{stats.guarded}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter by scope</span>
        </div>
        <div className="w-full md:w-64">
          <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as ScopeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="All scopes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scopes</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
              <SelectItem value="organization">Organization</SelectItem>
              <SelectItem value="repository">Repository</SelectItem>
              <SelectItem value="cost_center">Cost Center</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">Showing {filteredBudgets.length} of {budgets.length}</div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create budget</CardTitle>
            <CardDescription>Define a new spending limit for your enterprise.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBudgetForm onSubmit={handleCreateBudget} onCancel={() => setShowCreateForm(false)} loading={creating} />
          </CardContent>
        </Card>
      )}

      <BudgetList budgets={filteredBudgets} onDelete={handleDeleteRequest} deletingBudgetId={deletingBudgetId} usageData={usageData} />

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => (open ? setDeleteDialogOpen(true) : closeDeleteDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete budget</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The budget for {selectedBudget?.budget_product_sku ?? "this selection"} will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Scope:</span> {selectedBudget?.budget_scope ?? "—"}</p>
            <p><span className="font-medium">Limit:</span> {selectedBudget ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(selectedBudget.budget_amount) : "—"}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDeleteDialog} disabled={Boolean(deletingBudgetId)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDelete} disabled={Boolean(deletingBudgetId)}>
              {deletingBudgetId ? "Deleting..." : "Delete budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
