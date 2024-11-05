import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Doctor } from '@/types/medical-staff';
import { LocationType } from '@/types/calendar';

export class AnesthesiologistService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  async findAvailableAnesthesiologist(
    accessToken: string,
    startTime: string,
    duration: number,
    location: LocationType,
    anesthesiologists: Doctor[]
  ): Promise<Doctor | null> {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString();

    // Filter anesthesiologists by location first
    const locationAnesthesiologists = anesthesiologists.filter(
      a => a.defaultLocation === location && a.active
    );

    if (!locationAnesthesiologists.length) {
      throw new Error(`No anesthesiologists available in ${location}`);
    }

    // Check availability for each anesthesiologist
    for (const anesthesiologist of locationAnesthesiologists) {
      try {
        const response = await calendar.freebusy.query({
          requestBody: {
            timeMin: startTime,
            timeMax: endTime,
            items: [{ id: anesthesiologist.calendarId }],
          },
        });

        const busyPeriods = response.data.calendars?.[anesthesiologist.calendarId]?.busy || [];
        
        // If no busy periods, anesthesiologist is available
        if (busyPeriods.length === 0) {
          return anesthesiologist;
        }
      } catch (error) {
        console.error(`Error checking availability for anesthesiologist ${anesthesiologist.id}:`, error);
      }
    }

    return null;
  }

  async getAnesthesiologistAvailability(
    accessToken: string,
    anesthesiologist: Doctor,
    startTime: string,
    endTime: string
  ) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          items: [{ id: anesthesiologist.calendarId }],
        },
      });

      const busyPeriods = response.data.calendars?.[anesthesiologist.calendarId]?.busy || [];

      return {
        doctorId: anesthesiologist.id,
        available: busyPeriods.length === 0,
        conflicts: busyPeriods.map(period => ({
          start: period.start,
          end: period.end,
          reason: 'Existing appointment'
        }))
      };
    } catch (error) {
      console.error(`Error checking anesthesiologist availability:`, error);
      throw error;
    }
  }
}