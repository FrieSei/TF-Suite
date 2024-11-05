"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Priority } from "@/types/notification";

interface NotificationsListProps {
  filters: {
    priority: string;
    type: string;
    status: string;
  };
}

export function NotificationsList({ filters }: NotificationsListProps) {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.priority !== "all") params.append("priority", filters.priority);
      if (filters.type !== "all") params.append("type", filters.type);
      if (filters.status !== "all") params.append("status", filters.status);

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  const getPriorityBadgeVariant = (priority: Priority) => {
    switch (priority) {
      case "URGENT":
        return "destructive";
      case "HIGH":
        return "default";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Message</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Sent At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notifications?.map((notification: any) => (
          <TableRow key={notification.id}>
            <TableCell className="font-medium">{notification.message}</TableCell>
            <TableCell>
              <Badge variant="outline">{notification.type}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={getPriorityBadgeVariant(notification.priority)}>
                {notification.priority}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={notification.status === "SENT" ? "success" : "destructive"}
              >
                {notification.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(notification.sent_at), "PPp")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}