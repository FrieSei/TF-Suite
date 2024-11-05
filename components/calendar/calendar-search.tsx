"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { AppointmentCard } from './appointment-card';
import { CalendarFilters } from './calendar-filters';
import { LocationType, AppointmentStatus } from '@/types/calendar';

interface CalendarSearchProps {
  surgeonId?: string;
  onAppointmentClick?: (appointmentId: string) => void;
}

export function CalendarSearch({ surgeonId, onAppointmentClick }: CalendarSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: undefined as LocationType | undefined,
    status: undefined as AppointmentStatus | undefined,
    upcomingOnly: true
  });

  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['calendar-search', debouncedQuery, surgeonId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.append('query', debouncedQuery);
      if (surgeonId) params.append('surgeonId', surgeonId);
      if (filters.location) params.append('location', filters.location);
      if (filters.status) params.append('status', filters.status);
      params.append('upcomingOnly', filters.upcomingOnly.toString());

      const response = await fetch(`/api/calendar/search?${params}`);
      if (!response.ok) throw new Error('Failed to search appointments');
      return response.json();
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1.5 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <CalendarFilters
        filters={filters}
        onFilterChange={setFilters}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : searchResults?.length > 0 ? (
        <div className="space-y-4">
          {searchResults.map((appointment: any) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onClick={() => onAppointmentClick?.(appointment.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          No appointments found matching your criteria.
        </p>
      )}
    </div>
  );
}