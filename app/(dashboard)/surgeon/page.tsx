"use client";

import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, AlertCircle } from 'lucide-react';
import { AppointmentList } from '@/components/appointments/appointment-list';
import { CreateAppointmentDialog } from '@/components/appointments/create-appointment-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';

export default function SurgeonDashboard() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const today = new Date();

  const { data: stats } = useQuery({
    queryKey: ['surgeon-stats', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/surgeons/${user?.id}/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const metrics = [
    {
      title: "Today's Appointments",
      value: stats?.todayAppointments || 0,
      description: `${stats?.surgeries || 0} surgeries, ${stats?.consultations || 0} consultations`,
      icon: Calendar,
    },
    {
      title: "Active Patients",
      value: stats?.activePatients || 0,
      description: `+${stats?.newPatients || 0} this week`,
      icon: Users,
    },
    {
      title: "Next Appointment",
      value: stats?.nextAppointment ? format(new Date(stats.nextAppointment.time), 'HH:mm') : '--:--',
      description: stats?.nextAppointment?.type || 'No upcoming appointments',
      icon: Clock,
    },
    {
      title: "Pending Actions",
      value: stats?.pendingActions || 0,
      description: `${stats?.urgentActions || 0} urgent`,
      icon: AlertCircle,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Surgeon Dashboard</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          New Appointment
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
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentList
              date={today}
              surgeonId={user?.id}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add pending actions list component here */}
          </CardContent>
        </Card>
      </div>

      <CreateAppointmentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        surgeonId={user?.id!}
      />
    </div>
  );
}
