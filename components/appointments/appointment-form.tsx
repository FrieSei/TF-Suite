"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AppointmentType, PROCEDURE_TYPES, ProcedureTypes } from "@/types/appointment";

// Improve type safety for procedures
type ProcedureCategory = keyof ProcedureTypes;
type SurgicalProcedure = keyof ProcedureTypes['surgery'];
type MinimalProcedure = keyof ProcedureTypes['minimal'];

const formSchema = z.object({
  patient_name: z.string().min(2, {
    message: "Patient name must be at least 2 characters.",
  }),
  patient_phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  appointment_type: z.enum(['surgery', 'minimal', 'consultation'] as const),
  procedure: z.string(),
  date: z.string(),
  time: z.string(),
  duration: z.number(),
  location: z.enum(["Vienna", "Linz", "Munich"]),
  surgeon_id: z.string(),
  notes: z.string().optional(),
});

interface AppointmentFormProps {
  onSuccess: () => void;
  selectedDate: Date;
}

export function AppointmentForm({ onSuccess, selectedDate }: AppointmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<AppointmentType>('consultation');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(selectedDate, "yyyy-MM-dd"),
      time: "09:00",
      duration: 30,
      location: "Vienna",
      appointment_type: "consultation",
      notes: "",
    },
  });

  const getProceduresForType = (type: AppointmentType) => {
    if (type === 'consultation') return ['Initial Consultation'];
    return Object.keys(PROCEDURE_TYPES[type]);
  };

  const onAppointmentTypeChange = (type: AppointmentType) => {
    setSelectedType(type);
    const procedures = getProceduresForType(type);
    form.setValue('procedure', procedures[0]);
    
    if (type === 'consultation') {
      form.setValue('duration', PROCEDURE_TYPES.consultation.duration);
    } else {
      // Type-safe access to procedures
      const procedureKey = procedures[0] as string & keyof typeof PROCEDURE_TYPES[typeof type];
      const procedure = PROCEDURE_TYPES[type][procedureKey];
      form.setValue('duration', procedure.duration);
    }
  };

  // Rest of the component remains the same...
  // [Previous return statement and form JSX remains unchanged]

  return (
    <Form {...form}>
      {/* Keep all existing JSX unchanged */}
      {/* Your existing form JSX here */}
    </Form>
  );
}
