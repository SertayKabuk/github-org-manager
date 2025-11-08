'use client';

import type { MouseEvent } from "react";
import { Building2, Users, Lock, Package } from "lucide-react";

import type { CostCenter } from "@/lib/types/github";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CostCenterCardProps {
  costCenter: CostCenter;
  onClick?: (costCenter: CostCenter) => void;
}

export default function CostCenterCard({ costCenter, onClick }: CostCenterCardProps) {
  const userCount = costCenter.resources.filter((r) => r.type === "User").length;
  const repoCount = costCenter.resources.filter((r) => r.type === "Repo").length;
  const orgCount = costCenter.resources.filter((r) => r.type === "Organization").length;

  return (
    <Card
      onClick={onClick ? () => onClick(costCenter) : undefined}
      className={[
        "flex h-full cursor-pointer flex-col transition-all hover:shadow-lg",
        onClick ? "" : "cursor-default",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{costCenter.name}</CardTitle>
          </div>
          <Badge variant={costCenter.state === "active" ? "default" : "secondary"} className="capitalize">
            {costCenter.state}
          </Badge>
        </div>
        {costCenter.azure_subscription && (
          <CardDescription className="line-clamp-1 font-mono text-xs">
            Azure: {costCenter.azure_subscription}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" title="Users">
            <Users className="h-4 w-4" />
            <span>{userCount}</span>
          </div>
          <div className="flex items-center gap-1" title="Repositories">
            <Package className="h-4 w-4" />
            <span>{repoCount}</span>
          </div>
          <div className="flex items-center gap-1" title="Organizations">
            <Lock className="h-4 w-4" />
            <span>{orgCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
