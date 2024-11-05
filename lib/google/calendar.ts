import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabaseAdmin } from '@/lib/supabase';
import {
  LocationType,
  CalendarType,
  SurgeonAvailability,
  Appointment,
  CalendarIntegration
} from '@/types/calendar';

export class CalendarService {
  private calendar;
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  private async getAuthForUser(userId: string) {
    const { data: credentials, error } = await supabaseAdmin
      .from('calendar_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !credentials) {
      throw new Error('No calendar credentials found');
    }

    this.oauth2Client.setCredentials({
      refresh_token: credentials.refresh_token,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date
    });

    return this.oauth2Client;
  }

  private async getCalendarIntegration(
    userId: string,
    location: LocationType,
    calendarType: CalendarType
  ): Promise<CalendarIntegration> {
    const { data, error } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*')
      .match({
        user_id: userId,
        location,
        calendar_type: calendarType
      })
      .single();

    if (error || !data) {
      throw new Error(`Calendar not found for ${location} - ${calendarType}`);
    }

    return data as CalendarIntegration;
  }

  async getSurgeonAvailability(
    surgeonId: string,
    startDate: Date,
    endDate: Date,
    location?: LocationType
  ): Promise<SurgeonAvailability[]> {
    const { data: calendars, error } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', surgeonId);

    if (error || !calendars?.length) {
      throw new Error('No calendars found for surgeon');
    }

    const relevantCalendars = location
      ? calendars.filter(cal => cal.location === location)
      : calendars;

    const auth = await this.getAuthForUser(surgeonId);
    this.calendar = google.calendar({ version: 'v3', auth });

    const availabilityPromises = relevantCalendars.map(async (cal) => {
      const { data: events } = await this.calendar.events.list({
        calendarId: cal.calendar_id,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return {
        surgeonId,
        location: cal.location as LocationType,
        ranges: events.items?.map(event => ({
          start: event.start?.dateTime || event.start?.date!,
          end: event.end?.dateTime || event.end?.date!,
          recurrence: event.recurrence
        })) || []
      };
    });

    return Promise.all(availabilityPromises);
  }

  async checkAvailability(
    surgeonId: string,
    location: LocationType,
    proposedStart: Date,
    proposedEnd: Date,
    appointmentType: CalendarType
  ): Promise<boolean> {
    // Check if surgeon works at this location
    const { data: surgeonLocation, error: locationError } = await supabaseAdmin
      .from('surgeon_locations')
      .select('*')
      .match({ surgeon_id: surgeonId, location })
      .single();

    if (locationError || !surgeonLocation) return false;

    // Check template availability
    const dayOfWeek = proposedStart.getDay();
    const timeStr = proposedStart.toTimeString().slice(0, 8);

    const { data: template, error: templateError } = await supabaseAdmin
      .from('availability_templates')
      .select('*')
      .match({
        surgeon_id: surgeonId,
        location,
        day_of_week: dayOfWeek,
        is_active: true
      })
      .single();

    if (templateError || !template) return false;

    if (timeStr < template.start_time || 
        proposedEnd.toTimeString().slice(0, 8) > template.end_time) {
      return false;
    }

    // Check existing appointments
    const { data: existingAppointments } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .match({
        surgeon_id: surgeonId,
        location,
        status: 'scheduled'
      })
      .or(`start_time.gte.${proposedStart.toISOString()},end_time.lte.${proposedEnd.toISOString()}`);

    if (existingAppointments?.length) return false;

    // Check Google Calendar availability
    const availability = await this.getSurgeonAvailability(
      surgeonId,
      new Date(proposedStart.setHours(0, 0, 0, 0)),
      new Date(proposedEnd.setHours(23, 59, 59, 999)),
      location
    );

    const locationAvailability = availability.find(a => a.location === location);
    if (!locationAvailability) return false;

    return locationAvailability.ranges.some(range => {
      const rangeStart = new Date(range.start);
      const rangeEnd = new Date(range.end);
      return proposedStart >= rangeStart && proposedEnd <= rangeEnd;
    });
  }

  async createAppointment(
    surgeonId: string,
    patientId: string,
    location: LocationType,
    startTime: Date,
    endTime: Date,
    appointmentType: CalendarType,
    notes?: string
  ): Promise<Appointment> {
    const isAvailable = await this.checkAvailability(
      surgeonId,
      location,
      startTime,
      endTime,
      appointmentType
    );

    if (!isAvailable) {
      throw new Error('Time slot is not available');
    }

    const calendarIntegration = await this.getCalendarIntegration(
      surgeonId,
      location,
      appointmentType
    );

    const auth = await this.getAuthForUser(surgeonId);
    this.calendar = google.calendar({ version: 'v3', auth });

    // Get patient details for the event summary
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('name')
      .eq('id', patientId)
      .single();

    const event = await this.calendar.events.insert({
      calendarId: calendarIntegration.calendarId,
      requestBody: {
        summary: `${appointmentType.toUpperCase()} - ${patient?.name || patientId}`,
        description: notes,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        extendedProperties: {
          private: {
            appointmentType,
            patientId,
            surgeonId,
            location
          }
        }
      }
    });

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        patient_id: patientId,
        surgeon_id: surgeonId,
        location,
        start_time: startTime,
        end_time: endTime,
        type: appointmentType,
        status: 'scheduled',
        google_event_id: event.data.id,
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Rollback Google Calendar event if database insert fails
      await this.calendar.events.delete({
        calendarId: calendarIntegration.calendarId,
        eventId: event.data.id!
      });
      throw error;
    }

    return appointment as Appointment;
  }

  async updateAppointment(
    appointmentId: string,
    updates: Partial<Appointment>
  ): Promise<Appointment> {
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      throw new Error('Appointment not found');
    }

    const calendarIntegration = await this.getCalendarIntegration(
      appointment.surgeon_id,
      appointment.location,
      appointment.type
    );

    const auth = await this.getAuthForUser(appointment.surgeon_id);
    this.calendar = google.calendar({ version: 'v3', auth });

    if (appointment.google_event_id) {
      await this.calendar.events.patch({
        calendarId: calendarIntegration.calendarId,
        eventId: appointment.google_event_id,
        requestBody: {
          start: updates.startTime ? { dateTime: updates.startTime.toISOString() } : undefined,
          end: updates.endTime ? { dateTime: updates.endTime.toISOString() } : undefined,
          description: updates.notes
        }
      });
    }

    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedAppointment as Appointment;
  }

  async deleteAppointment(appointmentId: string): Promise<void> {
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.google_event_id) {
      const calendarIntegration = await this.getCalendarIntegration(
        appointment.surgeon_id,
        appointment.location,
        appointment.type
      );

      const auth = await this.getAuthForUser(appointment.surgeon_id);
      this.calendar = google.calendar({ version: 'v3', auth });

      await this.calendar.events.delete({
        calendarId: calendarIntegration.calendarId,
        eventId: appointment.google_event_id
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (deleteError) {
      throw deleteError;
    }
  }
}