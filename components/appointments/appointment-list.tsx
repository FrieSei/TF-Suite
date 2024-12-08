"use client";

import { format, isValid, parseISO } from "date-fns";
import { AppointmentType } from "@/types/calendar";
import { useAppointments } from "@/hooks/use-appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { EVENT_TYPES } from "@/types/calendar";
import { useMemo } from "react";

interface AppointmentListProps {
  date: Date | null; // Ensures the prop matches the usage
  surgeonId?: string;
  location?: string;
  onAppointmentClick?: (appointmentId: string) => void;
}

export function AppointmentList({
  date,
  surgeonId,
  location,
  onAppointmentClick,
}: AppointmentListProps) {
  const { toast } = useToast();
  const {
    appointments,
    isLoading,
    error,
    updateAppointment,
    cancelAppointment,
  } = useAppointments(date, { surgeonId, location });

  const formattedDate = useMemo(() => {
    if (!date || !isValid(date)) return "Invalid date";
    return format(date, "MMMM d, yyyy");
  }, [date]);

  const handleCancel = async (appointmentId: string) => {
    try {
      await cancelAppointment.mutateAsync(appointmentId);
      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    }
  };

  const formatAppointmentTime = (timeString: string) => {
    try {
      const date = parseISO(timeString);
      if (!isValid(date)) return "Invalid time";
      return format(date, "HH:mm");
    } catch {
      return "Invalid time";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-destructive text-center">
            Failed to load appointments
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "completed":
        return "success";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments for {formattedDate}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No appointments scheduled for this date
            </p>
          ) : (
            appointments.map((appointment: AppointmentType) => {
              const eventType = EVENT_TYPES[appointment.event_type.code];
              return (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  onClick={() => onAppointmentClick?.(appointment.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${eventType.color}20`,
                          color: eventType.color,
                        }}
                      >
                        {eventType.name}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </div>
                    <p className="font-medium">{appointment.patient_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAppointmentTime(appointment.start_time)} -{" "}
                      {formatAppointmentTime(appointment.end_time)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(appointment.id);
                        }}
                        className="text-destructive"
                      >
                        Cancel Appointment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
