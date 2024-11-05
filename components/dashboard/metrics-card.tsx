"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetric } from "@/types";

interface MetricsCardProps {
  metric: DashboardMetric;
}

export function MetricsCard({ metric }: MetricsCardProps) {
  const Icon = metric.icon;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {metric.title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metric.value}</div>
        <p className="text-xs text-muted-foreground">
          {metric.description}
        </p>
      </CardContent>
    </Card>
  );
}