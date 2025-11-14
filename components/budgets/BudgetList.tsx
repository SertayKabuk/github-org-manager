'use client';

import BudgetCard from "./BudgetCard";
import type { Budget } from "@/lib/types/github";

interface BudgetListProps {
  budgets: Budget[];
  onDelete?: (budget: Budget) => void;
  deletingBudgetId?: string | null;
}

export default function BudgetList({ budgets, onDelete, deletingBudgetId = null }: BudgetListProps) {
  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">No budgets configured yet.</p>
        <p className="text-xs text-muted-foreground/80">Create your first budget to start tracking spend.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {budgets.map((budget) => (
        <BudgetCard
          key={budget.id}
          budget={budget}
          onDelete={onDelete}
          deleting={deletingBudgetId === budget.id}
        />
      ))}
    </div>
  );
}
