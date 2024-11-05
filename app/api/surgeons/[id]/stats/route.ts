import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    // Get today's appointments
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('surgeon_id', params.id)
      .gte('start_time', todayStart)
      .lte('end_time', todayEnd)
      .neq('status', 'cancelled');

    if (appointmentsError) throw appointmentsError;

    // Get next appointment
    const { data: nextAppointment, error: nextAppointmentError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('surgeon_id', params.id)
      .eq('status', 'scheduled')
      .gte('start_time', new Date().toISOString())
      .order('start_time')
      .limit(1)
      .single();

    if (nextAppointmentError && nextAppointmentError.code !== 'PGRST116') {
      throw nextAppointmentError;
    }

    // Get active patients count
    const { count: activePatients, error: patientsError } = await supabaseAdmin
      .from('appointments')
      .select('patient_id', { count: 'exact', head: true })
      .eq('surgeon_id', params.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (patientsError) throw patientsError;

    // Get new patients this week
    const { count: newPatients, error: newPatientsError } = await supabaseAdmin
      .from('appointments')
      .select('patient_id', { count: 'exact', head: true })
      .eq('surgeon_id', params.id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (newPatientsError) throw newPatientsError;

    // Count surgeries and consultations
    const surgeries = appointments?.filter(a => a.type === 'surgery').length || 0;
    const consultations = appointments?.filter(a => a.type === 'consultation').length || 0;

    return NextResponse.json({
      todayAppointments: appointments?.length || 0,
      surgeries,
      consultations,
      activePatients: activePatients || 0,
      newPatients: newPatients || 0,
      nextAppointment: nextAppointment || null,
      pendingActions: 0, // Implement pending actions logic
      urgentActions: 0, // Implement urgent actions logic
    });
  } catch (error: any) {
    console.error('Error fetching surgeon stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch surgeon stats' },
      { status: 500 }
    );
  }
}