import { NotificationTemplate, PatientLanguage } from '@/types/medical-practice';

interface TemplateSet {
  [key: string]: {
    [key in PatientLanguage]: NotificationTemplate;
  };
}

// Surgery specific templates
const SURGERY_TEMPLATES: TemplateSet = {
  'reminder': {
    german: {
      id: 'surgery-reminder-de',
      type: 'sms',
      subject: 'Erinnerung an Ihre Operation',
      body: `Freundliche Erinnerung an Ihre Operation morgen. Wir freuen uns darauf, Sie bestens zu versorgen! Bitte denken Sie daran, 6 Stunden vor der Operation nichts zu essen oder zu trinken. Vermeiden Sie Aspirin und NSAIDs (wie Ibuprofen). Bei Fragen können Sie sich jederzeit an uns wenden. Wir freuen uns auf Sie!`,
      variables: ['patientName', 'time']
    },
    english: {
      id: 'surgery-reminder-en',
      type: 'sms',
      subject: 'Surgery Reminder',
      body: `Just a friendly reminder about your surgery tomorrow. We're looking forward to taking good care of you! Please remember not to eat or drink anything 6 hours before your surgery time. Make sure to avoid aspirin and NSAIDs (like ibuprofen). For any questions, feel free to reach out to us. We're looking forward to seeing you!`,
      variables: ['patientName', 'time']
    }
  }
};

// Minimal invasive and consultation templates share the same simple reminder
const SIMPLE_REMINDER_TEMPLATES: TemplateSet = {
  'reminder': {
    german: {
      id: 'simple-reminder-de',
      type: 'sms',
      subject: 'Terminerinnerung',
      body: `Freundliche Erinnerung an Ihren Termin morgen. Wir freuen uns auf Sie!`,
      variables: ['patientName', 'time']
    },
    english: {
      id: 'simple-reminder-en',
      type: 'sms',
      subject: 'Appointment Reminder',
      body: `Just a friendly reminder about your appointment tomorrow. We're looking forward to seeing you!`,
      variables: ['patientName', 'time']
    }
  }
};

export const NOTIFICATION_TEMPLATES = {
  surgery: SURGERY_TEMPLATES,
  minimal: SIMPLE_REMINDER_TEMPLATES,
  consultation: SIMPLE_REMINDER_TEMPLATES
};