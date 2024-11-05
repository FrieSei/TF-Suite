import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabaseAdmin } from '@/lib/supabase';
import { LocationType } from '@/types/calendar';

export class StaffCalendarService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  async createStaffCalendar(userId: string, location: LocationType) {
    try {
      // Get user's calendar credentials
      const { data: credentials } = await supabaseAdmin
        .from('calendar_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!credentials) {
        throw new Error('Calendar credentials not found');
      }

      this.oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Create staff calendar
      const { data: newCalendar } = await calendar.calendars.insert({
        requestBody: {
          summary: `${location} - Staff Schedule`,
          description: `Staff availability calendar for ${location} location`,
          timeZone: 'Europe/Vienna'
        }
      });

      // Store calendar integration
      await supabaseAdmin
        .from('calendar_integrations')
        .insert({
          user_id: userId,
          calendar_id: newCalendar.id,
          calendar_type: 'general',
          location,
          created_at: new Date().toISOString()
        });

      return newCalendar;
    } catch (error) {
      console.error('Error creating staff calendar:', error);
      throw error;
    }
  }

  async addAvailabilityEvent(
    userId: string,
    location: LocationType,
    startTime: string,
    endTime: string,
    scheduleType: 'regular' | 'on_call' | 'surgery' | 'consultation'
  ) {
    try {
      // Get calendar integration
      const { data: integration } = await supabaseAdmin
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('location', location)
        .single();

      if (!integration) {
        throw new Error('Calendar integration not found');
      }

      // Get user's calendar credentials
      const { data: credentials } = await supabaseAdmin
        .from('calendar_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!credentials) {
        throw new Error('Calendar credentials not found');
      }

      this.oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Create availability event
      const event = await calendar.events.insert({
        calendarId: integration.calendar_id,
        requestBody: {
          summary: `${scheduleType.toUpperCase()} Availability`,
          start: { dateTime: startTime },
          end: { dateTime: endTime },
          colorId: this.getScheduleTypeColor(scheduleType),
          extendedProperties: {
            private: {
              scheduleType,
              location
            }
          }
        }
      });

      // Store in staff_schedules table
      await supabaseAdmin
        .from('staff_schedules')
        .insert({
          staff_id: userId,
          location,
          start_time: startTime,
          end_time: endTime,
          schedule_type: scheduleType,
          google_event_id: event.data.id
        });

      return event.data;
    } catch (error) {
      console.error('Error adding availability event:', error);
      throw error;
    }
  }

  private getScheduleTypeColor(type: string): string {
    switch (type) {
      case 'regular':
        return '1'; // Lavender
      case 'on_call':
        return '4'; // Sage
      case 'surgery':
        return '11'; // Red
      case 'consultation':
        return '7'; // Cyan
      default:
        return '1';
    }
  }

  async getStaffAvailability(
    userId: string,
    location: LocationType,
    startDate: string,
    endDate: string
  ) {
    try {
      const { data: integration } = await supabaseAdmin
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('location', location)
        .single();

      if (!integration) {
        throw new Error('Calendar integration not found');
      }

      const { data: credentials } = await supabaseAdmin
        .from('calendar_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!credentials) {
        throw new Error('Calendar credentials not found');
      }

      this.oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.list({
        calendarId: integration.calendar_id,
        timeMin: startDate,
        timeMax: endDate,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items;
    } catch (error) {
      console.error('Error fetching staff availability:', error);
      throw error;
    }
  }
}