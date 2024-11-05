"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaintenanceAlert } from "@/types";

const alerts: MaintenanceAlert[] = [
  {
    id: "1",
    equipment: "Laser System A",
    status: "Maintenance Due",
    dueDate: "Next Week",
    priority: "medium",
    location: "Vienna",
  },
  {
    id: "2",
    equipment: "Operating Room 1",
    status: "Filter Change",
    dueDate: "Tomorrow",
    priority: "high",
    location: "Vienna",
  },
  {
    id: "3",
    equipment: "Sterilization Unit",
    status: "Inspection",
    dueDate: "Today",
    priority: "low",
    location: "Vienna",
  },
];

export function MaintenanceAlerts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0"
            >
              <div>
                <div className="font-medium">{alert.equipment}</div>
                <div className="text-sm text-muted-foreground">
                  {alert.status}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{alert.dueDate}</div>
                <div className="text-sm text-muted-foreground">
                  {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)} Priority
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}