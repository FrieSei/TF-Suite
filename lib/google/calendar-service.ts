import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { EVENT_TYPES } from '@/types/calendar';
import { AnesthesiologistService } from './anesthesiologist-service';
import { supabaseAdmin } from '@/lib/supabase';

export class CalendarService {
  private oauth2Client: OAuth2Client;
  private anesthesiologistService: AnesthesiologistService;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    this.anesthesiologistService = new AnesthesiologistService();
  }

  async checkAvailability(
    accessToken: string,
    surgeonId: string,
    startTime: Date,
    endTime: Date,
    eventTypeCode: string,
    location: string
  ) {
    try {
      const eventType = EVENT_TYPES[eventTypeCode];
      if (!eventType) throw new Error('Invalid event type');

      const isSurgical = eventType.category === 'SURGICAL';

      // Check surgeon availability
      const surgeonAvailable = await this.checkSurgeonAvailability(
        accessToken,
        surgeonId,
        startTime,
        endTime
      );

      if (!surgeonAvailable) {
        return { available: false, reason: 'Surgeon is not available at this time' };
      }

      // For surgical procedures, check anesthesiologist availability
      if (isSurgical) {
        const { data: anesthesiologists } = await supabaseAdmin
          .from('doctors')
          .select('*')
          .eq('role', 'ANESTHESIOLOGIST')
          .eq('default_location', location)
          .eq('active', true);

        if (!anesthesiologists?.length) {
          return { available: false, reason: 'No anesthesiologists available at this location' };
        }

        const availableAnesthesiologist = await this.anesthesiologistService.findAvailableAnesthesiologist(
          accessToken,
          startTime.toISOString(),
          (endTime.getTime() - startTime.getTime()) / 60000,
          location,
          anesthesiologists
        );

        if (!availableAnesthesiologist) {
          return { available: false, reason: 'No anesthesiologist available for this time slot' };
        }

        return { available: true, anesthesiologist: availableAnesthesiologist };
      }

      return { available: true };
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  private async checkSurgeonAvailability(
    accessToken: string,
    surgeonId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const { data: calendarId } = await supabaseAdmin
      .from('doctors')
      .select('calendar_id')
      .eq('id', surgeonId)
      .single();

    if (!calendarId) throw new Error('Surgeon calendar not found');

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: calendarId.calendar_id }],
      },
    });

    const busyPeriods = response.data.calendars?.[calendarId.calendar_id]?.busy || [];
    return busyPeriods.length === 0;
  }

  async createEvent(
    accessToken: string,
    calendarId: string,
    event: {
      summary: string;
      description?: string;
      location?: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      attendees?: Array<{ email: string }>;
    }
  ): Promise<string> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.insert({
        calendarId,
        requestBody: {
          ...event,
          reminders: { useDefault: true },
        },
      });

      if (!response.data.id) throw new Error('Failed to create calendar event');

      return response.data.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: {
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime: string; timeZone?: string };
      end?: { dateTime: string; timeZone?: string };
      attendees?: Array<{ email: string }>;
    }
  ): Promise<void> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  async getEvent(accessToken: string, calendarId: string, eventId: string) {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.get({
        calendarId,
        eventId,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting calendar event:', error);
      throw error;
    }
  }
}
