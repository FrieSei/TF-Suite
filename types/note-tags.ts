"use client";

export interface NoteTag {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface AppointmentMetadata {
  appointmentId: string;
  visitType: string;
  dateTime: string;
  tags: string[];
}

export const DEFAULT_NOTE_TAGS: NoteTag[] = [
  {
    id: 'surgery',
    name: 'Surgery',
    color: '#ef4444',
    description: 'Surgical procedure notes'
  },
  {
    id: 'consultation',
    name: 'Consultation',
    color: '#3b82f6',
    description: 'Initial or follow-up consultation'
  },
  {
    id: 'minimal',
    name: 'Minimal Invasive',
    color: '#10b981',
    description: 'Minimal invasive procedures'
  },
  {
    id: 'post-op',
    name: 'Post-Op',
    color: '#8b5cf6',
    description: 'Post-operative follow-up'
  },
  {
    id: 'emergency',
    name: 'Emergency',
    color: '#f97316',
    description: 'Emergency consultation'
  }
];