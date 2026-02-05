'use client';

import { useRouter } from "next/navigation";

import type { CostCenter, Budget } from "@/lib/types/github";

import CostCenterCard from "./CostCenterCard";

interface CostCenterListProps {
  costCenters: CostCenter[];
  budgets?: Budget[];
}

export default function CostCenterList({ costCenters, budgets = [] }: CostCenterListProps) {
  const router = useRouter();

  const handleCostCenterClick = (costCenter: CostCenter) => {
    router.push(`/cost-centers/${costCenter.id}`);
  };

  if (costCenters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No cost centers found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {costCenters.map((costCenter) => {
        const budget = budgets.find(
          (b) => b.budget_scope === "cost_center" && b.budget_entity_name === costCenter.name
        );
        
        return (
          <CostCenterCard
            key={costCenter.id}
            costCenter={costCenter}
            budget={budget}
            onClick={handleCostCenterClick}
          />
        );
      })}
    </div>
  );
}
