"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";

export default function AppointmentsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const handleDateSelect = (day: Date | undefined) => {
    setSelectedDate(day || null); // Convert `undefined` to `null` for consistency
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateSelect}
            className="rounded-md border"
          />
        </div>
        {/* Ensure the correct prop name is passed */}
        <AppointmentList date={selectedDate} />
      </div>

      <CreateAppointmentDialog
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        selectedDate={selectedDate} // Ensure this matches your dialog component props
      />
    </div>
  );
}
