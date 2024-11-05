import { supabaseAdmin } from '@/lib/supabase';
import { oauth2Client } from './auth';
import { google } from 'googleapis';

export class CalendarIntegrationService {
  private calendar;

  constructor() {
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async storeCalendarTokens(
    code: string,
    userId: string,
    location: string
  ): Promise<void> {
    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Store tokens in calendar_credentials
      const { error: credentialsError } = await supabaseAdmin
        .from('calendar_credentials')
        .upsert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: new Date(tokens.expiry_date!).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (credentialsError) throw credentialsError;

      // Create surgery and consultation calendars
      const surgeryCalendar = await this.createCalendar(
        `${location} - Surgeries`,
        `Surgery calendar for ${location} location`
      );

      const consultationCalendar = await this.createCalendar(
        `${location} - Consultations`,
        `Consultation calendar for ${location} location`
      );

      // Store calendar integrations
      const { error: integrationsError } = await supabaseAdmin
        .from('calendar_integrations')
        .insert([
          {
            user_id: userId,
            calendar_id: surgeryCalendar.data.id,
            calendar_type: 'surgery',
            location,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            user_id: userId,
            calendar_id: consultationCalendar.data.id,
            calendar_type: 'consultation',
            location,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (integrationsError) throw integrationsError;

    } catch (error) {
      console.error('Error storing calendar tokens:', error);
      throw new Error('Failed to store calendar integration tokens');
    }
  }

  private async createCalendar(summary: string, description: string) {
    try {
      return await this.calendar.calendars.insert({
        requestBody: {
          summary,
          description,
          timeZone: 'Europe/Vienna'
        }
      });
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  }
}