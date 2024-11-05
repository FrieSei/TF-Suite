"use client";

import { useState } from 'react';
import { LocationType, CalendarType, TimeSlot } from '@/types/calendar';

interface UseAvailabilityProps {
  surgeonId: string;
  location: LocationType;
  type: CalendarType;
}

export function useAvailability({ surgeonId, location, type }: UseAvailabilityProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableSlots = async (
    startDate: Date,
    endDate: Date,
    duration: number
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/appointments/availability?` +
        `surgeonId=${surgeonId}&` +
        `startDate=${startDate.toISOString()}&` +
        `endDate=${endDate.toISOString()}&` +
        `duration=${duration}&` +
        `location=${location}&` +
        `type=${type}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch availability');
      }

      setAvailableSlots(data.slots);
    } catch (error: any) {
      setError(error.message);
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAvailability = async (startTime: Date, endTime: Date) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/appointments/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surgeonId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check availability');
      }

      return data.available;
    } catch (error: any) {
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    availableSlots,
    fetchAvailableSlots,
    checkAvailability
  };
}