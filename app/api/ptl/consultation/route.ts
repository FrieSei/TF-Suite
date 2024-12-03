import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ConsultationStatus } from '@/types/ptl-surgery';
import { SurgeryStatus } from '@/types/surgery-core';

/**
 * POST: Schedule a new consultation appointment.
 * @param request - JSON body containing surgeryId, date, and notes.
 * @returns The newly created appointment or an error message.
 */
export async function POST(request: Request) {
  try {
    const { surgeryId, date, notes } = await request.json();

    if (!surgeryId || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create consultation appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('ptl_consultation_appointments')
      .insert({
        surgery_id: surgeryId,
        scheduled_date: date,
        notes,
        status: ConsultationStatus.SCHEDULED
      })
      .select()
      .single();

    if (appointmentError) throw appointmentError;

    // Update surgery status
    const { error: surgeryError } = await supabaseAdmin
      .from('ptl_surgeries')
      .update({
        consultation_status: ConsultationStatus.SCHEDULED,
        consultation_date: date,
        updated_at: new Date().toISOString()
      })
      .eq('id', surgeryId);

    if (surgeryError) throw surgeryError;

    return NextResponse.json({ success: true, appointment });
  } catch (error: any) {
    console.error('Error scheduling consultation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to schedule consultation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update an existing consultation appointment.
 * @param request - JSON body containing appointmentId, status, and notes.
 * @returns The updated appointment or an error message.
 */
export async function PATCH(request: Request) {
  try {
    const { appointmentId, status, notes } = await request.json();

    if (!appointmentId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update consultation appointment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('ptl_consultation_appointments')
      .update({
        status,
        notes: notes || undefined,
        completed_date: status === ConsultationStatus.COMPLETED ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        surgery:ptl_surgeries(*)
      `)
      .single();

    if (appointmentError) throw appointmentError;

    // If consultation is completed, update surgery status
    if (status === ConsultationStatus.COMPLETED) {
      const { error: surgeryError } = await supabaseAdmin
        .from('ptl_surgeries')
        .update({
          consultation_status: ConsultationStatus.COMPLETED,
          consultation_completion_date: new Date().toISOString(),
          surgery_status: SurgeryStatus.CONSULTATION_COMPLETED,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.surgery.id);

      if (surgeryError) throw surgeryError;
    }

    return NextResponse.json({ success: true, appointment });
  } catch (error: any) {
    console.error('Error updating consultation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update consultation' },
      { status: 500 }
    );
  }
}
