import { LocationType, CalendarType, AppointmentStatus } from './enums';

// Represents a specific time slot
export type TimeSlot = {
  start: string;
  end: string;
  type: string;
};

// Represents an availability template for scheduling
export type AvailabilityTemplate = {
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  location: LocationType;
  isActive: boolean;
};

// Represents a specific type of event
export type EventType = {
  id: string;
  name: string;
  code: string;
  duration: number[];
  requiresAnesthesiologist: boolean;
  color: string;
  description: string;
  category: CalendarType;
};

// Event type definitions
export const EVENT_TYPES: Record<string, EventType> = {
  TELE_CONSULT: {
    id: 'tele-consult',
    name: 'Telephone Consultation',
    code: 'TELE_CONSULT',
    duration: [15, 30],
    requiresAnesthesiologist: false,
    color: '#039BE5',
    description: 'Virtual consultation via telephone',
    category: CalendarType.CONSULTATION,
  },
  AESTHETIC_CONSULT: {
    id: 'aesthetic-consult',
    name: 'Aesthetic Medicine Consultation',
    code: 'AESTHETIC_CONSULT',
    duration: [30, 45],
    requiresAnesthesiologist: false,
    color: '#7986CB',
    description: 'In-person aesthetic medicine consultation',
    category: CalendarType.CONSULTATION,
  },
  INJECTABLE: {
    id: 'injectable',
    name: 'Injectable Treatment',
    code: 'INJECTABLE',
    duration: [15, 30],
    requiresAnesthesiologist: false,
    color: '#33B679',
    description: 'Botox and filler procedures',
    category: CalendarType.GENERAL,
  },
  FACELIFT: {
    id: 'facelift',
    name: 'Facelift Surgery',
    code: 'FACELIFT',
    duration: [180, 240],
    requiresAnesthesiologist: true,
    color: '#D50000',
    description: 'Full facelift surgical procedure',
    category: CalendarType.SURGERY,
  },
  RHINOPLASTY: {
    id: 'rhinoplasty',
    name: 'Rhinoplasty',
    code: 'RHINOPLASTY',
    duration: [120, 180],
    requiresAnesthesiologist: true,
    color: '#E67C73',
    description: 'Nose reshaping surgery',
    category: CalendarType.SURGERY,
  },
  BLEPHAROPLASTY: {
    id: 'blepharoplasty',
    name: 'Blepharoplasty',
    code: 'BLEPHAROPLASTY',
    duration: [90, 120],
    requiresAnesthesiologist: true,
    color: '#F4511E',
    description: 'Eyelid surgery',
    category: CalendarType.SURGERY,
  },
} as const;
