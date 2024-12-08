import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ConsultationStatus } from '@/types/ptl-surgery';
import { SurgeryStatus } from '@/types/surgery-core';

/**
 * PATCH: Update an existing consultation appointment.
 * @param request - JSON body containing appointmentId, status, and notes.
 * @returns The updated appointment or an error message.
 */
export async function PATCH(request: Request) {
  try {
    const { appointmentId, status, notes } = await request.json();

    // Validate required fields
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select(`
        *,
        surgery:ptl_surgeries(*)
      `)
      .single();

    if (appointmentError) {
      console.error('Error updating consultation appointment:', appointmentError);
      throw new Error('Failed to update consultation appointment');
    }

    // If consultation is completed, update related surgery status
    if (status === ConsultationStatus.COMPLETED) {
      const { error: surgeryError } = await supabaseAdmin
        .from('ptl_surgeries')
        .update({
          consultation_status: ConsultationStatus.COMPLETED,
          consultation_completion_date: new Date().toISOString(),
          surgery_status: SurgeryStatus.COMPLETED, // Use an existing valid SurgeryStatus
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.surgery.id);

      if (surgeryError) {
        console.error('Error updating surgery status:', surgeryError);
        throw new Error('Failed to update surgery status');
      }
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
