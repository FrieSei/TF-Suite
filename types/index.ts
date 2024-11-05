export interface User {
  id: string;
  email: string;
  role: 'surgeon' | 'backoffice';
  name: string;
  location: 'Vienna' | 'Linz' | 'Munich';
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  procedureType: 'surgery' | 'consultation' | 'minimal-invasive';
  date: string;
  time: string;
  duration: number;
  surgeonId: string;
  location: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface MaintenanceAlert {
  id: string;
  equipment: string;
  status: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  location: string;
}

export interface DashboardMetric {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType;
}