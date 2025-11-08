'use client';

import { useRouter } from "next/navigation";

import type { CostCenter } from "@/lib/types/github";

import CostCenterCard from "./CostCenterCard";

interface CostCenterListProps {
  costCenters: CostCenter[];
}

export default function CostCenterList({ costCenters }: CostCenterListProps) {
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
      {costCenters.map((costCenter) => (
        <CostCenterCard
          key={costCenter.id}
          costCenter={costCenter}
          onClick={handleCostCenterClick}
        />
      ))}
    </div>
  );
}
