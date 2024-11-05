import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  try {
    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    // Get today's appointments
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .gte('start_time', todayStart)
      .lte('end_time', todayEnd)
      .neq('status', 'cancelled');

    if (appointmentsError) throw appointmentsError;

    // Get active staff count
    const { data: activeStaff, error: staffError } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('active', true);

    if (staffError) throw staffError;

    // Get waiting room count
    const { count: waitingPatients, error: waitingError } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('start_time', todayStart)
      .lte('end_time', todayEnd);

    if (waitingError) throw waitingError;

    // Count surgeries and consultations
    const surgeries = appointments?.filter(a => a.type === 'surgery').length || 0;
    const consultations = appointments?.filter(a => a.type === 'consultation').length || 0;

    // Count staff by role
    const surgeons = activeStaff?.filter(s => s.role === 'SURGEON').length || 0;
    const nurses = activeStaff?.filter(s => s.role === 'NURSE').length || 0;

    // Get equipment status
    const { data: equipment, error: equipmentError } = await supabaseAdmin
      .from('equipment')
      .select('*')
      .eq('status', 'maintenance_needed');

    if (equipmentError) throw equipmentError;

    const equipmentStatus = Math.round(
      ((activeStaff?.length || 0) - (equipment?.length || 0)) / (activeStaff?.length || 1) * 100
    );

    return NextResponse.json({
      totalAppointments: appointments?.length || 0,
      surgeries,
      consultations,
      staffOnDuty: activeStaff?.length || 0,
      surgeons,
      nurses,
      waitingPatients: waitingPatients || 0,
      equipmentStatus,
      maintenanceNeeded: equipment?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching backoffice stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch backoffice stats' },
      { status: 500 }
    );
  }
}