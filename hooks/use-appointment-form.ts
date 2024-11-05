"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WizardDataSchema, type WizardData } from "@/lib/validations/appointment";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import { EVENT_TYPES } from "@/types/calendar";

interface UseAppointmentFormProps {
  onSuccess?: (data: WizardData) => void;
  defaultValues?: Partial<WizardData>;
}

export function useAppointmentForm({ onSuccess, defaultValues }: UseAppointmentFormProps = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<WizardData>({
    resolver: zodResolver(WizardDataSchema),
    defaultValues: {
      eventTypeId: "",
      duration: 0,
      date: new Date(),
      time: "09:00",
      location: "Vienna",
      notes: "",
      ...defaultValues,
    },
  });

  const selectedEventType = form.watch("eventTypeId") 
    ? EVENT_TYPES[form.watch("eventTypeId")]
    : null;

  const onSubmit = async (data: WizardData) => {
    try {
      setIsSubmitting(true);

      // Validate that the selected duration is valid for the event type
      if (selectedEventType && !selectedEventType.duration.includes(data.duration)) {
        throw new Error("Invalid duration for selected procedure");
      }

      // Check if anesthesiologist is required
      if (selectedEventType?.requiresAnesthesiologist) {
        // Here you would typically check anesthesiologist availability
        const isAnesthesiologistAvailable = await checkAnesthesiologistAvailability(
          data.date,
          data.time,
          data.duration
        );

        if (!isAnesthesiologistAvailable) {
          throw new Error("No anesthesiologist available for this time slot");
        }
      }

      await onSuccess?.(data);

      toast({
        title: "Success",
        description: "Appointment scheduled successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule appointment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    selectedEventType,
    onSubmit: form.handleSubmit(onSubmit),
  };
}

async function checkAnesthesiologistAvailability(
  date: Date,
  time: string,
  duration: number
): Promise<boolean> {
  // Implementation would go here
  return true;
}