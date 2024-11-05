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
import { Button } from "@/components/ui/button";
import { MoreHorizontal, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export function EquipmentList() {
  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const response = await fetch("/api/equipment");
      if (!response.ok) throw new Error("Failed to fetch equipment");
      return response.json();
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "operational":
        return "success";
      case "maintenance_needed":
        return "warning";
      case "maintenance_scheduled":
        return "default";
      case "out_of_service":
        return "destructive";
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
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Maintenance</TableHead>
          <TableHead className="w-[70px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {equipment?.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  {item.model}
                </div>
              </div>
            </TableCell>
            <TableCell>{item.type}</TableCell>
            <TableCell>{item.location}</TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(item.status)}>
                {item.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell>
              {item.last_maintenance_date
                ? format(new Date(item.last_maintenance_date), "PPP")
                : "Never"}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Schedule Maintenance</DropdownMenuItem>
                  <DropdownMenuItem>Update Status</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Mark Out of Service
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}