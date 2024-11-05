"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentWizard } from "./appointment-wizard";
import { LocationType } from "@/types/calendar";
import { useToast } from "@/components/ui/use-toast";

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surgeonId: string;
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  surgeonId,
}: CreateAppointmentDialogProps) {
  const { toast } = useToast();

  const handleComplete = async (appointment: {
    eventTypeId: string;
    startTime: Date;
    duration: number;
    location: LocationType;
  }) => {
    try {
      // Here you would integrate with your appointment creation API
      // const response = await createAppointment({ ...appointment, surgeonId });
      
      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule appointment",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
        </DialogHeader>
        <AppointmentWizard
          surgeonId={surgeonId}
          onComplete={handleComplete}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}