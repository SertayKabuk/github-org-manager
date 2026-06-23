'use client';

import { useMemo, useState } from "react";
import { Filter, Plus, RefreshCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import BudgetList from "@/components/budgets/BudgetList";
import CreateBudgetForm from "@/components/budgets/CreateBudgetForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getSpentAmountForBudget } from "@/lib/budget-usage";
import { useBudgets, useCostCenters } from "@/lib/hooks";
import type { ApiResponse, Budget, BudgetCreateResult, BudgetDeleteResult, CreateBudgetInput, BudgetScope, BillingUsageItem } from "@/lib/types/github";

type BudgetCreationResponse = ApiResponse<BudgetCreateResult>;
type BudgetDeleteResponse = ApiResponse<BudgetDeleteResult>;

type ScopeFilter = "all" | BudgetScope;

import { withBasePath } from "@/lib/utils";

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const {
    data: budgets = [],
    isLoading: loading,
    error: budgetsError,
    refetch: refetchBudgets,
  } = useBudgets();

  const { data: costCenters = [] } = useCostCenters({ state: "active" });

  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["budget-transactions"],
    queryFn: async (): Promise<any[]> => {
      const response = await fetch(withBasePath("/api/budgets/transactions"));
      if (!response.ok) {
        throw new Error("Failed to fetch budget transactions.");
      }
      const json = await response.json();
      return json.data || [];
    },
  });

  const error = budgetsError || actionError;

  // Build cost center name-to-ID mapping
  const costCenterNameToId = useMemo(() => {
    return costCenters.reduce(
      (acc, cc) => {
        acc[cc.name] = cc.id;
        return acc;
      },
      {} as Record<string, string>
    );
  }, [costCenters]);

  const queryableBudgets = useMemo(
    () =>
      budgets
        .filter(
          (budget) =>
            (budget.budget_scope === "cost_center" ||
              budget.budget_scope === "user" ||
              budget.budget_scope === "multi_user_customer") &&
            budget.budget_entity_name
        )
        .map((budget) => ({
          id: budget.id,
          scope: budget.budget_scope,
          budgetType: budget.budget_type,
          budgetProductSku: budget.budget_product_sku ?? null,
          budgetEntityName: budget.budget_entity_name ?? null,
          costCenterId: budget.budget_scope === "cost_center" && budget.budget_entity_name
            ? costCenterNameToId[budget.budget_entity_name] ?? null
            : null,
        })),
    [budgets, costCenterNameToId]
  );

  const {
    data: usageData = {},
    refetch: refetchUsageData,
    isFetching: usageLoading,
  } = useQuery({
    queryKey: ["budget-usage-map", queryableBudgets],
    enabled: queryableBudgets.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      const results = await Promise.all(
        queryableBudgets.map(async (budget) => {
          let url = "";
          if (budget.scope === "user") {
            url = `/api/billing-usage?user=${encodeURIComponent(budget.budgetEntityName || "")}`;
          } else if (budget.scope === "multi_user_customer") {
            url = `/api/billing-usage?aiCredits=true`;
          } else {
            if (!budget.costCenterId) {
              console.warn(`No cost center ID found for name: ${budget.budgetEntityName}`);
              return { budgetId: budget.id, spent: 0 };
            }
            url = `/api/billing-usage?costCenterId=${encodeURIComponent(budget.costCenterId)}`;
          }

          try {
            const response = await fetch(withBasePath(url));

            if (!response.ok) {
              console.warn(`Failed to fetch usage for ${budget.budgetEntityName}`);
              return { budgetId: budget.id, spent: 0 };
            }

            const json = (await response.json()) as ApiResponse<{
              usageItems?: BillingUsageItem[];
            } | null>;
            const usageItems = json.data?.usageItems ?? [];
            const spent = getSpentAmountForBudget(
              {
                budget_product_sku: budget.budgetProductSku ?? undefined,
                budget_type: budget.budgetType,
              },
              usageItems
            );

            return { budgetId: budget.id, spent };
          } catch (err) {
            console.error(`Error fetching usage for ${budget.budgetEntityName}:`, err);
            return { budgetId: budget.id, spent: 0 };
          }
        })
      );

      return results.reduce<Record<string, number>>((acc, { budgetId, spent }) => {
        acc[budgetId] = spent;
        return acc;
      }, {});
    },
  });

  const handleRefresh = async () => {
    await Promise.all([
      refetchBudgets(),
      refetchTransactions(),
      queryableBudgets.length > 0 ? refetchUsageData() : Promise.resolve(null),
    ]);
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
    setActionError(null);

    try {
      const response = await fetch(withBasePath(`/api/budgets/${selectedBudget.id}`), {
        method: "DELETE",
      });

      const json = (await response.json().catch(() => null)) as BudgetDeleteResponse | null;

      if (!response.ok) {
        throw new Error(json?.data.message ?? `Failed to delete budget (${response.status})`);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["budget-usage-map"] }),
      ]);
      setDeleteDialogOpen(false);
      setSelectedBudget(null);
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to delete budget.");
    } finally {
      setDeletingBudgetId(null);
    }
  };

  const handleCreateBudget = async (data: CreateBudgetInput & {
    transfer?: {
      fromUser: string;
      fromUserBudgetId: string;
      fromUserSpent: number;
      remaining: number;
      fromUserBudgetScope?: string;
      fromUserAlerting?: any;
    }
  }) => {
    setCreating(true);
    setActionError(null);

    try {
      const response = await fetch(withBasePath("/api/budgets"), {
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["budget-usage-map"] }),
      ]);
    } catch (err) {
      console.error(err);
      setActionError(err instanceof Error ? err.message : "Failed to create budget.");
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
          <Button variant="outline" onClick={() => void handleRefresh()} disabled={loading || usageLoading}>
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
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(stats.totalAmount)}
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

      {error && (
        <ErrorMessage
          message={error instanceof Error ? error.message : error}
          onDismiss={() => setActionError(null)}
        />
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create budget</CardTitle>
            <CardDescription>Define a new spending limit for your enterprise.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateBudgetForm onSubmit={handleCreateBudget} onCancel={() => setShowCreateForm(false)} loading={creating} budgets={budgets} />
          </CardContent>
        </Card>
      )}

      <BudgetList budgets={filteredBudgets} onDelete={handleDeleteRequest} deletingBudgetId={deletingBudgetId} usageData={usageData} />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Transaction History</CardTitle>
          <CardDescription>Auditing log of recent budget allocations and transfers.</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading && transactions.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No budget transactions recorded yet.</p>
          ) : (
            <div className="divide-y text-sm">
              {transactions.map((tx: any) => {
                const isTxTransfer = tx.transaction_type === "transfer";
                const date = new Date(tx.created_at).toLocaleString();
                return (
                  <div key={tx.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isTxTransfer 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}>
                          {isTxTransfer ? "Transfer" : "Create"}
                        </span>
                        <span className="font-medium text-foreground">
                          {isTxTransfer ? (
                            <>
                              Transferred remaining <span className="font-semibold text-emerald-600">${Number(tx.transferred_amount).toFixed(2)}</span> from{" "}
                              <span className="font-semibold text-blue-600">@{tx.from_user}</span> to{" "}
                              <span className="font-semibold text-blue-600">@{tx.to_user}</span>
                              <span className="text-muted-foreground font-normal"> (base: ${Number(tx.amount).toFixed(2)})</span>
                            </>
                          ) : (
                            <>
                              Created budget of <span className="font-semibold text-emerald-600">${Number(tx.amount).toFixed(2)}</span> for{" "}
                              <span className="font-semibold text-blue-600">@{tx.to_user}</span>
                            </>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{date}</span>
                    </div>
                    {tx.note && (
                      <p className="text-xs text-muted-foreground italic pl-2 border-l-2 border-muted mt-1 bg-muted/10 py-1 pr-2 rounded">
                        Note: {tx.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
