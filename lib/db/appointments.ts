import { supabase } from '@/lib/supabase';
import { Appointment } from '@/types';

export async function createAppointment(appointment: Omit<Appointment, 'id'>) {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointment])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAppointmentsByDate(date: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', date)
    .order('time');

  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(
  id: string,
  status: 'scheduled' | 'completed' | 'cancelled'
) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}