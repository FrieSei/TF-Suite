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
      if (!eventType) {
        throw new Error('Invalid event type');
      }

      // Check if it's a surgical procedure
      const isSurgical = eventType.category === 'SURGICAL';

      // Check surgeon availability
      const surgeonAvailable = await this.checkSurgeonAvailability(
        accessToken,
        surgeonId,
        startTime,
        endTime
      );

      if (!surgeonAvailable) {
        return {
          available: false,
          reason: 'Surgeon is not available at this time'
        };
      }

      // For surgical procedures, ALWAYS check anesthesiologist availability
      if (isSurgical) {
        const { data: anesthesiologists } = await supabaseAdmin
          .from('doctors')
          .select('*')
          .eq('role', 'ANESTHESIOLOGIST')
          .eq('default_location', location)
          .eq('active', true);

        if (!anesthesiologists?.length) {
          return {
            available: false,
            reason: 'No anesthesiologists available at this location'
          };
        }

        const availableAnesthesiologist = await this.anesthesiologistService.findAvailableAnesthesiologist(
          accessToken,
          startTime.toISOString(),
          (endTime.getTime() - startTime.getTime()) / 60000,
          location,
          anesthesiologists
        );

        if (!availableAnesthesiologist) {
          return {
            available: false,
            reason: 'No anesthesiologist available for this time slot'
          };
        }

        return {
          available: true,
          anesthesiologist: availableAnesthesiologist
        };
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

    if (!calendarId) {
      throw new Error('Surgeon calendar not found');
    }

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

  // ... rest of the service methods remain the same
}