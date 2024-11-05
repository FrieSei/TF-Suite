import { supabaseAdmin } from '@/lib/supabase';
import { LocationType, AppointmentStatus } from '@/types/calendar';

interface SearchFilters {
  surgeonId?: string;
  location?: LocationType;
  status?: AppointmentStatus;
  fromDate?: Date;
  toDate?: Date;
  upcomingOnly?: boolean;
}

export class CalendarSearchService {
  private prepareSearchQuery(query: string): string {
    // Convert search query to tsquery format
    return query
      .trim()
      .split(/\s+/)
      .map(term => `${term}:*`)
      .join(' & ');
  }

  async searchAppointments(searchQuery: string | null, filters?: SearchFilters) {
    try {
      const formattedQuery = searchQuery ? this.prepareSearchQuery(searchQuery) : null;

      const { data: results, error } = await supabaseAdmin.rpc(
        'search_appointments',
        {
          search_query: formattedQuery,
          p_surgeon_id: filters?.surgeonId || null,
          p_location: filters?.location || null,
          p_status: filters?.status || null,
          p_from_date: filters?.fromDate?.toISOString() || null,
          p_to_date: filters?.toDate?.toISOString() || null,
          p_upcoming_only: filters?.upcomingOnly || false
        }
      );

      if (error) throw error;

      // Fetch related data
      const appointments = await Promise.all(
        results.map(async (appointment) => {
          const [patientData, eventTypeData] = await Promise.all([
            supabaseAdmin
              .from('profiles')
              .select('name')
              .eq('id', appointment.patient_id)
              .single(),
            supabaseAdmin
              .from('event_types')
              .select('*')
              .eq('id', appointment.event_type_id)
              .single()
          ]);

          return {
            ...appointment,
            patient: patientData.data,
            eventType: eventTypeData.data,
            rank: parseFloat(appointment.rank)
          };
        })
      );

      return appointments;
    } catch (error) {
      console.error('Error searching appointments:', error);
      throw error;
    }
  }
}