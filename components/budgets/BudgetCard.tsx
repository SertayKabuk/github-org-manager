'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Budget } from "@/lib/types/github";
import { AlertOctagon, BellRing, Coins, ShieldCheck, Trash2 } from "lucide-react";

interface BudgetCardProps {
  budget: Budget;
  onDelete?: (budget: Budget) => void;
  deleting?: boolean;
}

const scopeLabels: Record<Budget["budget_scope"], string> = {
  enterprise: "Enterprise",
  organization: "Organization",
  repository: "Repository",
  cost_center: "Cost Center",
};

export default function BudgetCard({ budget, onDelete, deleting = false }: BudgetCardProps) {
  const skuLabel = budget.budget_product_sku ?? "–";
  const amountLabel = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(budget.budget_amount);

  return (
    <Card className="flex h-full flex-col gap-4 border-border/60">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{amountLabel}</CardTitle>
              <CardDescription>Budget limit</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {scopeLabels[budget.budget_scope]}
            </Badge>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(budget)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete budget</span>
              </Button>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">SKU:</span> {skuLabel}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 text-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <div>
            Prevent overspend:
            <span className="ml-2 font-medium text-foreground">
              {budget.prevent_further_usage ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-amber-500" />
          <div className="flex flex-wrap items-center gap-1">
            <span>Pricing:</span>
            <Badge variant="outline" className="capitalize">
              {budget.budget_type}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-cyan-500" />
          {budget.budget_alerting.will_alert ? (
            <div className="flex flex-wrap gap-2">
              {budget.budget_alerting.alert_recipients.length === 0 ? (
                <span>No recipients defined</span>
              ) : (
                budget.budget_alerting.alert_recipients.map((recipient) => (
                  <Badge key={recipient} variant="outline">@{recipient}</Badge>
                ))
              )}
            </div>
          ) : (
            <span>Alerts disabled</span>
          )}
        </div>
        {budget.budget_entity_name && (
          <div className="text-muted-foreground">
            Applies to: <span className="font-medium text-foreground">{budget.budget_entity_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
