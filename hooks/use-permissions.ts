"use client";

import { useEffect, useState } from 'react';
import { StaffRole, StaffPermissions } from '@/types/staff';
import { hasPermission } from '@/lib/auth/permissions';

export function usePermissions(role: StaffRole) {
  const [permissions, setPermissions] = useState<{
    [K in keyof StaffPermissions]: {
      [Action in keyof StaffPermissions[K]]: boolean;
    };
  } | null>(null);

  useEffect(() => {
    const staffPermissions = {
      appointments: {
        create: hasPermission(role, 'appointments', 'create'),
        read: hasPermission(role, 'appointments', 'read'),
        update: hasPermission(role, 'appointments', 'update'),
        delete: hasPermission(role, 'appointments', 'delete'),
        confirm: hasPermission(role, 'appointments', 'confirm'),
      },
      patients: {
        create: hasPermission(role, 'patients', 'create'),
        read: hasPermission(role, 'patients', 'read'),
        update: hasPermission(role, 'patients', 'update'),
        delete: hasPermission(role, 'patients', 'delete'),
        medical_history: hasPermission(role, 'patients', 'medical_history'),
      },
      staff: {
        create: hasPermission(role, 'staff', 'create'),
        read: hasPermission(role, 'staff', 'read'),
        update: hasPermission(role, 'staff', 'update'),
        delete: hasPermission(role, 'staff', 'delete'),
        manage_roles: hasPermission(role, 'staff', 'manage_roles'),
      },
      billing: {
        create: hasPermission(role, 'billing', 'create'),
        read: hasPermission(role, 'billing', 'read'),
        update: hasPermission(role, 'billing', 'update'),
        delete: hasPermission(role, 'billing', 'delete'),
        process_payments: hasPermission(role, 'billing', 'process_payments'),
      },
    };

    setPermissions(staffPermissions);
  }, [role]);

  return permissions;
}