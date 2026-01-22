'use client';

import { useUserCostCenter, useUserBudgets } from "@/lib/hooks";
import { Loading } from "@/components/ui/Loading";
import ErrorMessage from "@/components/ui/ErrorMessage";
import BudgetCard from "@/components/budgets/BudgetCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export function UserCostCenterSection() {
  const { data: costCenter, isLoading: ccLoading, error: ccError } = useUserCostCenter();
  const { data: budgets, isLoading: bLoading, error: bError } = useUserBudgets();

  if (ccLoading || bLoading) return <Loading />;
  if (ccError) return <ErrorMessage message={ccError.message} />;
  
  // Hide section entirely if no cost center is assigned
  if (!costCenter) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Cost Center: {costCenter.name}</CardTitle>
            <CardDescription>
              Your account is billed under this cost center.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {costCenter.azure_subscription && (
              <p>Azure Subscription: <span className="font-mono">{costCenter.azure_subscription}</span></p>
            )}
            <p>Resources: {costCenter.resources.length} (including you)</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Budgets</h3>
        {bError ? (
          <ErrorMessage message={bError.message} />
        ) : !budgets || budgets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No budgets defined for your cost center.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {budgets.map((budget) => (
              <BudgetCard key={budget.id} budget={budget} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
