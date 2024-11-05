"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { NotificationFilters } from "@/components/notifications/notification-filters";

export default function NotificationsPage() {
  const [filters, setFilters] = useState({
    priority: "all",
    type: "all",
    status: "all",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <NotificationFilters filters={filters} onFilterChange={setFilters} />
        <Card>
          <NotificationsList filters={filters} />
        </Card>
      </div>
    </div>
  );
}