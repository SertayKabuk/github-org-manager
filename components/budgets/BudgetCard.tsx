'use client';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Budget } from "@/lib/types/github";
import { MoreVertical } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BudgetCardProps {
  budget: Budget;
  onDelete?: (budget: Budget) => void;
  deleting?: boolean;
  spent?: number;
}

export default function BudgetCard({ budget, onDelete, deleting = false, spent = 0 }: BudgetCardProps) {
  const budgetAmount = budget.budget_amount;
  const spentAmount = spent;
  const percentage = budgetAmount > 0 ? Math.min((spentAmount / budgetAmount) * 100, 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Determine progress bar color based on percentage
  const getProgressColor = () => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-blue-500";
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 text-card-foreground">
      {/* Cost center / Entity name column */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Cost center</span>
        </div>
        <div className="truncate font-medium">
          {budget.budget_entity_name || budget.budget_scope}
        </div>
      </div>

      {/* SKU column */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">SKU</span>
        </div>
        <div className="truncate text-sm">
          {budget.budget_product_sku || "—"}
        </div>
      </div>

      {/* Stop usage column */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Stop usage</span>
        </div>
        <div className="text-sm">
          {budget.prevent_further_usage ? "Yes" : "No"}
        </div>
      </div>

      {/* Usage progress column */}
      <div className="flex min-w-0 flex-[2] flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${getProgressColor()}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 tabular-nums">
            {percentage.toFixed(0)}%
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(spentAmount)} spent</span>
          <span>{formatCurrency(budgetAmount)} budget</span>
        </div>
      </div>

      {/* Actions menu */}
      <div>
        {onDelete && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={deleting}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(budget)}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete budget"}
              </Button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
