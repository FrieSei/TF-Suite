import { SupabaseClient } from '@supabase/supabase-js';

interface UserPreferences {
  user_id: string;
  notification_preferences?: {
    surgery_reminders: boolean;
    consultation_reminders: boolean;
    emergency_alerts: boolean;
  };
  access_level?: string;
  managed_locations?: string[];
}

export async function setupSurgeonPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const preferences: UserPreferences = {
    user_id: userId,
    notification_preferences: {
      surgery_reminders: true,
      consultation_reminders: true,
      emergency_alerts: true
    }
  };

  const { error } = await supabase
    .from('surgeon_preferences')
    .insert(preferences);

  if (error) throw error;
}

export async function setupBackofficePreferences(
  supabase: SupabaseClient,
  userId: string,
  locations: string[] = ['Vienna']
): Promise<void> {
  const preferences: UserPreferences = {
    user_id: userId,
    access_level: 'standard',
    managed_locations: locations
  };

  const { error } = await supabase
    .from('staff_settings')
    .insert(preferences);

  if (error) throw error;
}

export async function setupUserByRole(
  supabase: SupabaseClient,
  userId: string,
  role: 'surgeon' | 'backoffice',
  locations?: string[]
): Promise<void> {
  switch (role) {
    case 'surgeon':
      await setupSurgeonPreferences(supabase, userId);
      break;
    case 'backoffice':
      await setupBackofficePreferences(supabase, userId, locations);
      break;
    default:
      throw new Error('Invalid role specified');
  }
}