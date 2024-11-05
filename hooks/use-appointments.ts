"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isValid } from "date-fns";
import { Appointment, AppointmentStatus } from "@/types/medical-practice";

interface UseAppointmentsOptions {
  surgeonId?: string;
  location?: string;
  status?: AppointmentStatus;
}

export function useAppointments(date: Date | null, options: UseAppointmentsOptions = {}) {
  const queryClient = useQueryClient();

  const fetchAppointments = async () => {
    if (!date || !isValid(date)) {
      return { appointments: [] };
    }

    const searchParams = new URLSearchParams({
      date: format(date, "yyyy-MM-dd"),
      ...(options.surgeonId && { surgeonId: options.surgeonId }),
      ...(options.location && { location: options.location }),
      ...(options.status && { status: options.status }),
    });

    const response = await fetch(`/api/appointments?${searchParams}`);
    if (!response.ok) {
      throw new Error("Failed to fetch appointments");
    }
    return response.json();
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["appointments", date ? format(date, "yyyy-MM-dd") : "none", options],
    queryFn: fetchAppointments,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    enabled: !!date && isValid(date),
  });

  const updateAppointment = useMutation({
    mutationFn: async (updates: Partial<Appointment> & { id: string }) => {
      const response = await fetch(`/api/appointments/${updates.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update appointment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to cancel appointment");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  return {
    appointments: data?.appointments ?? [],
    isLoading,
    error,
    updateAppointment,
    cancelAppointment,
  };
}