"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  Stethoscope,
  AlertCircle,
  Activity,
  Clock,
} from "lucide-react";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";
import { useState } from "react";

export default function BackofficeDashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const today = new Date();

  const { data: stats } = useQuery({
    queryKey: ["backoffice-stats"],
    queryFn: async () => {
      const response = await fetch("/api/backoffice/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const metrics = [
    {
      title: "Today&#39;s Schedule",
      value: stats?.totalAppointments || 0,
      description: `${stats?.surgeries || 0} surgeries, ${stats?.consultations || 0} consultations`,
      icon: Calendar,
    },
    {
      title: "Active Patients",
      value: stats?.activePatients || 0,
      description: `${stats?.waitingPatients || 0} in waiting room`,
      icon: Users,
    },
    {
      title: "Staff on Duty",
      value: stats?.staffOnDuty || 0,
      description: `${stats?.surgeons || 0} surgeons, ${stats?.nurses || 0} nurses`,
      icon: Activity,
    },
    {
      title: "Equipment Status",
      value: `${stats?.equipmentStatus || 100}%`,
      description: `${stats?.maintenanceNeeded || 0} need attention`,
      icon: Stethoscope,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Back Office Dashboard
        </h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Schedule Appointment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&#39;s Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentList date={today} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waiting Room</CardTitle>
          </CardHeader>
          <CardContent>{/* Add waiting room component here */}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equipment Status</CardTitle>
          </CardHeader>
          <CardContent>{/* Add equipment status component here */}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Schedule</CardTitle>
          </CardHeader>
          <CardContent>{/* Add staff schedule component here */}</CardContent>
        </Card>
      </div>

      <CreateAppointmentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        surgeonId={undefined} // Will be selected in the form
      />
    </div>
  );
}
