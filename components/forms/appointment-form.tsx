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
import { toast } from "@/components/ui/use-toast";
import { AppointmentType, PROCEDURE_TYPES, PatientLanguage } from "@/types/medical-practice";

const formSchema = z.object({
  patient_name: z.string().min(2, {
    message: "Patient name must be at least 2 characters.",
  }),
  patient_phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  patient_language: z.nativeEnum(PatientLanguage),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(selectedDate, "yyyy-MM-dd"),
      time: "09:00",
      duration: 30,
      location: "Vienna",
      appointment_type: "consultation",
      patient_language: PatientLanguage.GERMAN,
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
  form.setValue('appointment_type', type);
  form.setValue('procedure', procedures[0]);
  
  if (type === 'consultation') {
    form.setValue('duration', PROCEDURE_TYPES.consultation.duration);
  } else {
    const procedureCategory = PROCEDURE_TYPES[type];
    const selectedProcedure = procedures[0];
    
    if (selectedProcedure && selectedProcedure in procedureCategory) {
      form.setValue('duration', procedureCategory[selectedProcedure as keyof typeof procedureCategory].duration);
    }
  }
};

{selectedType === 'consultation' 
  ? PROCEDURE_TYPES.consultation.timeSlots.map((time) => (
      <SelectItem key={time} value={time}>
        {time}
      </SelectItem>
    ))
  : (() => {
      const currentProcedure = form.getValues('procedure');
      const procedureCategory = PROCEDURE_TYPES[selectedType];
      if (currentProcedure && currentProcedure in procedureCategory) {
        return procedureCategory[currentProcedure as keyof typeof procedureCategory].timeSlots.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ));
      }
      return null;
    })()
}

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      // TODO: Implement appointment creation
      console.log(values);
      toast({
        title: "Appointment scheduled",
        description: "The appointment has been successfully scheduled.",
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patient_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="patient_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+43 123 456 789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="patient_language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Language</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={PatientLanguage.GERMAN}>German</SelectItem>
                  <SelectItem value={PatientLanguage.ENGLISH}>English</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="appointment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Appointment Type</FormLabel>
                <Select
                  onValueChange={(value: AppointmentType) => {
                    field.onChange(value);
                    onAppointmentTypeChange(value);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="surgery">Surgery</SelectItem>
                    <SelectItem value="minimal">Minimal Invasive</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="procedure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Procedure</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select procedure" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getProceduresForType(selectedType).map((procedure) => (
                      <SelectItem key={procedure} value={procedure}>
                        {procedure}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectedType === 'consultation' 
                      ? PROCEDURE_TYPES.consultation.timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))
                      : PROCEDURE_TYPES[selectedType][form.getValues('procedure')]?.timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Vienna">Vienna</SelectItem>
                    <SelectItem value="Linz">Linz</SelectItem>
                    <SelectItem value="Munich">Munich</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="surgeon_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Surgeon</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select surgeon" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Dr. Weber</SelectItem>
                    <SelectItem value="2">Dr. Mueller</SelectItem>
                    <SelectItem value="3">Dr. Schmidt</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional notes or special requirements"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Scheduling..." : "Schedule Appointment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
