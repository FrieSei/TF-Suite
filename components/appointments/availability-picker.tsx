"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAvailability } from '@/hooks/use-availability';
import { LocationType, CalendarType, TimeSlot } from '@/types/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface AvailabilityPickerProps {
  surgeonId: string;
  location: LocationType;
  type: CalendarType;
  duration: number;
  onSlotSelect: (slot: TimeSlot) => void;
}

export function AvailabilityPicker({
  surgeonId,
  location,
  type,
  duration,
  onSlotSelect
}: AvailabilityPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const {
    isLoading,
    error,
    availableSlots,
    fetchAvailableSlots
  } = useAvailability({
    surgeonId,
    location,
    type
  });

  useEffect(() => {
    if (selectedDate) {
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 7); // Fetch a week's worth of slots
      fetchAvailableSlots(selectedDate, endDate, duration);
    }
  }, [selectedDate, duration]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedSlot(null);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    onSlotSelect(slot);
  };

  const filteredSlots = availableSlots.filter(slot => 
    format(new Date(slot.start), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Appointment Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md border"
            />
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-destructive text-sm">{error}</div>
            ) : filteredSlots.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No available slots for this date
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedSlot === slot ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleSlotSelect(slot)}
                  >
                    {format(new Date(slot.start), 'HH:mm')} -{' '}
                    {format(new Date(slot.end), 'HH:mm')}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}