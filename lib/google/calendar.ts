import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabaseAdmin } from '@/lib/supabase';
import {
  LocationType,
  CalendarType,
  AppointmentStatus,
} from '@/types/enums';
import {
  SurgeonAvailability,
  Appointment,
  CalendarIntegration,
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

  private async getAuthForUser(userId: string): Promise<OAuth2Client> {
    const { data: tokens } = await supabaseAdmin
      .from('user_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!tokens) throw new Error(`No tokens found for user ${userId}`);

    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    return this.oauth2Client;
  }

  async createCalendar(name: string, description: string) {
    const auth = await this.getAuthForUser('system'); // Use system credentials for creation
    this.calendar = google.calendar({ version: 'v3', auth });

    const calendar = await this.calendar.calendars.insert({
      requestBody: {
        summary: name,
        description: description,
        timeZone: 'Europe/Vienna', // Default timezone for Austria
      },
    });

    return calendar;
  }

  private async getCalendarIntegration(
    userId: string,
    location: LocationType,
    calendarType: CalendarType
  ): Promise<CalendarIntegration> {
    const { data, error } = await supabaseAdmin
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('location', location)
      .eq('calendar_type', calendarType)
      .single();

    if (error) throw new Error(`Error fetching calendar integration: ${error.message}`);
    if (!data) throw new Error(`No calendar integration found for user ${userId}`);

    return data as CalendarIntegration;
  }

  async scheduleAppointment(
    userId: string,
    location: LocationType,
    startTime: string,
    endTime: string,
    appointmentType: CalendarType,
    notes: string
  ): Promise<Appointment> {
    const auth = await this.getAuthForUser(userId);
    this.calendar = google.calendar({ version: 'v3', auth });

    const event = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Appointment (${appointmentType})`,
        description: notes,
        start: {
          dateTime: startTime,
          timeZone: 'Europe/Vienna',
        },
        end: {
          dateTime: endTime,
          timeZone: 'Europe/Vienna',
        },
      },
    });

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .insert([
        {
          user_id: userId,
          location,
          start_time: startTime,
          end_time: endTime,
          type: appointmentType,
          status: AppointmentStatus.SCHEDULED,
          google_event_id: event.data.id,
          notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .single();

    if (!appointment) throw new Error(`Failed to save appointment to the database`);

    return appointment as Appointment;
  }
}
