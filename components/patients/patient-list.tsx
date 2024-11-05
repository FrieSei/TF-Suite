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
import { MoreHorizontal, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface PatientListProps {
  searchQuery: string;
}

export function PatientList({ searchQuery }: PatientListProps) {
  const router = useRouter();

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      
      const response = await fetch(`/api/patients?${params}`);
      if (!response.ok) throw new Error("Failed to fetch patients");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Last Visit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No patients found
              </TableCell>
            </TableRow>
          ) : (
            patients?.map((patient: any) => (
              <TableRow key={patient.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {patient.id}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{patient.email}</div>
                    <div className="text-muted-foreground">{patient.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {patient.last_visit
                    ? format(new Date(patient.last_visit), "MMM d, yyyy")
                    : "Never"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={patient.active ? "default" : "secondary"}
                  >
                    {patient.active ? "Active" : "Inactive"}
                  </Badge>
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
                      <DropdownMenuItem
                        onClick={() => router.push(`/patients/${patient.id}`)}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/patients/${patient.id}/appointments`)}
                      >
                        View Appointments
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/patients/${patient.id}/medical-history`)}
                      >
                        Medical History
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}