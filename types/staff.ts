export type StaffRole = 'admin' | 'surgeon' | 'doctor' | 'nurse' | 'receptionist';

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  specialization?: string;
  locations: string[];
  active: boolean;
  created_at: string;
  last_login?: string;
}

export interface StaffPermissions {
  appointments: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    confirm: boolean;
  };
  patients: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    medical_history: boolean;
  };
  staff: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    manage_roles: boolean;
  };
  billing: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    process_payments: boolean;
  };
}

export const ROLE_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  admin: {
    appointments: { create: true, read: true, update: true, delete: true, confirm: true },
    patients: { create: true, read: true, update: true, delete: true, medical_history: true },
    staff: { create: true, read: true, update: true, delete: true, manage_roles: true },
    billing: { create: true, read: true, update: true, delete: true, process_payments: true }
  },
  surgeon: {
    appointments: { create: true, read: true, update: true, delete: false, confirm: true },
    patients: { create: false, read: true, update: true, delete: false, medical_history: true },
    staff: { create: false, read: true, update: false, delete: false, manage_roles: false },
    billing: { create: false, read: true, update: false, delete: false, process_payments: false }
  },
  doctor: {
    appointments: { create: true, read: true, update: true, delete: false, confirm: true },
    patients: { create: true, read: true, update: true, delete: false, medical_history: true },
    staff: { create: false, read: true, update: false, delete: false, manage_roles: false },
    billing: { create: true, read: true, update: false, delete: false, process_payments: false }
  },
  nurse: {
    appointments: { create: true, read: true, update: true, delete: false, confirm: false },
    patients: { create: false, read: true, update: true, delete: false, medical_history: true },
    staff: { create: false, read: true, update: false, delete: false, manage_roles: false },
    billing: { create: false, read: true, update: false, delete: false, process_payments: false }
  },
  receptionist: {
    appointments: { create: true, read: true, update: true, delete: false, confirm: true },
    patients: { create: true, read: true, update: true, delete: false, medical_history: false },
    staff: { create: false, read: true, update: false, delete: false, manage_roles: false },
    billing: { create: true, read: true, update: true, delete: false, process_payments: true }
  }
};