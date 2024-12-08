import { z } from 'zod';
import { LocationType, ProcedureCategory, AppointmentStatus } from '@/types/calendar';

// Enum schemas
export const LocationTypeSchema = z.enum(['Vienna', 'Linz', 'Munich'] as const);
export const ProcedureCategorySchema = z.enum(['CONSULTATION', 'MINIMAL_INVASIVE', 'SURGICAL'] as const);
export const AppointmentStatusSchema = z.enum(['scheduled', 'confirmed', 'completed', 'cancelled'] as const);

// Base schemas
export const EventTypeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Procedure name is required"),
  code: z.string(),
  category: ProcedureCategorySchema,
  description: z.string().nullable(),
  possible_durations: z.array(z.number().positive()).min(1),
  requires_anesthesiologist: z.boolean(),
  color: z.string(),
  calendar_type: z.enum(['surgery', 'consultation', 'general'] as const),
  created_at: z.string().datetime().optional()
});

export const AppointmentSchema = z.object({
  id: z.string().uuid().optional(),
  surgeon_id: z.string().uuid(),
  anesthesiologist_id: z.string().uuid().optional(),
  location: LocationTypeSchema,
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  type: z.enum(['surgery', 'consultation', 'general'] as const),
  status: AppointmentStatusSchema,
  google_event_id: z.string().optional(),
  event_type_id: z.string().uuid(),
  duration: z.number().positive(),
  notes: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
}).refine(
  data => new Date(data.end_time) > new Date(data.start_time),
  "End time must be after start time"
);

// Wizard step schemas
export const WizardDataSchema = z.object({
  eventTypeId: z.string().min(1, "Please select a procedure"),
  duration: z.number().positive("Please select a valid duration"),
  date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Invalid date format"
  }).nullable(),
  time: z.string().regex(
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    "Please select a valid time"
  ).nullable(),
  location: LocationTypeSchema,
  notes: z.string().optional()
});


// Complete wizard data schema
export const WizardDataSchema = z.object({
  eventTypeId: z.string().min(1, "Please select a procedure"),
  duration: z.number().positive("Please select a valid duration"),
  date: z.date({
    required_error: "Please select a date",
    invalid_type_error: "Invalid date format"
  }),
  time: z.string().regex(
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    "Please select a valid time"
  ),
  location: LocationTypeSchema,
  notes: z.string().optional()
});

// Types
export type ValidationError = {
  path: (string | number)[];
  message: string;
};

export type WizardData = z.infer<typeof WizardDataSchema>;
export type WizardStepData<T extends keyof typeof WizardStepSchemas> = 
  z.infer<typeof WizardStepSchemas[T]>;

// Validation functions
export const validateStep = async <T extends keyof typeof WizardStepSchemas>(
  step: T,
  data: Partial<WizardData>
): Promise<ValidationError[]> => {
  try {
    await WizardStepSchemas[step].parseAsync(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors.map(err => ({
        path: err.path,
        message: err.message
      }));
    }
    return [{ path: [], message: "Unknown validation error" }];
  }
};

export const validateCompleteData = async (
  data: WizardData
): Promise<ValidationError[]> => {
  try {
    await WizardDataSchema.parseAsync(data);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors.map(err => ({
        path: err.path,
        message: err.message
      }));
    }
    return [{ path: [], message: "Unknown validation error" }];
  }
};
