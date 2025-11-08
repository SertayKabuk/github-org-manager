'use client';

import { User, Package, Lock } from "lucide-react";

import type { CostCenterResource } from "@/lib/types/github";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResourceCardProps {
  resource: CostCenterResource;
  source?: string;
}

export default function ResourceCard({ resource, source }: ResourceCardProps) {
  const getIcon = () => {
    switch (resource.type) {
      case "User":
        return <User className="h-4 w-4" />;
      case "Repo":
        return <Package className="h-4 w-4" />;
      case "Organization":
        return <Lock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            {getIcon()}
          </div>
          <div>
            <p className="font-medium">{resource.name}</p>
            <p className="text-xs text-muted-foreground">{resource.type}</p>
          </div>
        </div>
        {source && (
          <Badge variant="outline" className="text-xs">
            {source}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
