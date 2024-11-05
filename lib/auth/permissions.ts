import { StaffRole, StaffPermissions, ROLE_PERMISSIONS } from '@/types/staff';

export function hasPermission(
  userRole: StaffRole,
  resource: keyof StaffPermissions,
  action: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions[resource]?.[action as keyof typeof permissions[keyof StaffPermissions]] ?? false;
}

export function canManageAppointments(role: StaffRole): boolean {
  return hasPermission(role, 'appointments', 'create') &&
         hasPermission(role, 'appointments', 'update');
}

export function canAccessMedicalRecords(role: StaffRole): boolean {
  return hasPermission(role, 'patients', 'medical_history');
}

export function canManageStaff(role: StaffRole): boolean {
  return hasPermission(role, 'staff', 'manage_roles');
}

export function canProcessPayments(role: StaffRole): boolean {
  return hasPermission(role, 'billing', 'process_payments');
}