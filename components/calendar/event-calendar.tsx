"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EVENT_TYPES, EventType, ProcedureCategory } from '@/types/calendar';

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: keyof typeof EVENT_TYPES;
}

interface EventCalendarProps {
  events?: Event[];
  onDateSelect?: (date: Date) => void;
  onEventClick?: (event: Event) => void;
  onAddEvent?: () => void;
}

const CATEGORY_STYLES = {
  [ProcedureCategory.CONSULTATION]: {
    background: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800'
  },
  [ProcedureCategory.MINIMAL_INVASIVE]: {
    background: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-300',
    hover: 'hover:bg-green-200 dark:hover:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800'
  },
  [ProcedureCategory.SURGICAL]: {
    background: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    hover: 'hover:bg-red-200 dark:hover:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800'
  }
};

export function EventCalendar({
  events = [],
  onDateSelect,
  onEventClick,
  onAddEvent
}: EventCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect?.(date);
    }
  };

  const getDayEvents = (date: Date) => {
    return events.filter(event => 
      format(event.start, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getEventStyles = (eventType: keyof typeof EVENT_TYPES) => {
    const category = EVENT_TYPES[eventType].category;
    return CATEGORY_STYLES[category];
  };

  const renderEventBadge = (category: ProcedureCategory) => {
    const styles = CATEGORY_STYLES[category];
    return (
      <Badge
        variant="outline"
        className={cn(
          styles.background,
          styles.text,
          styles.border,
          'font-medium'
        )}
      >
        {category.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-2">
          <CardTitle>Calendar</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            {Object.values(ProcedureCategory).map(category => (
              <div key={category} className="flex items-center gap-1">
                {renderEventBadge(category)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedDate(newDate);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedDate(newDate);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={onAddEvent}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            components={{
              DayContent: ({ date }) => {
                const dayEvents = getDayEvents(date);
                return (
                  <div className="w-full h-full min-h-[100px] p-1">
                    <div className="text-sm">{format(date, 'd')}</div>
                    <div className="space-y-1 mt-1">
                      {dayEvents.map((event) => {
                        const styles = getEventStyles(event.type);
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "text-xs p-1 rounded-sm cursor-pointer truncate border",
                              styles.background,
                              styles.text,
                              styles.hover,
                              styles.border
                            )}
                            onClick={() => onEventClick?.(event)}
                          >
                            {format(event.start, 'HH:mm')} - {event.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            }}
          />
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Selected Date</h3>
              <p className="text-2xl font-bold">
                {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Events</h3>
              <div className="space-y-2">
                {getDayEvents(selectedDate).map(event => {
                  const eventType = EVENT_TYPES[event.type];
                  const styles = CATEGORY_STYLES[eventType.category];
                  return (
                    <div
                      key={event.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        styles.background,
                        styles.hover,
                        styles.border
                      )}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {renderEventBadge(eventType.category)}
                        <span className="text-sm text-muted-foreground">
                          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                        </span>
                      </div>
                      <p className={cn("font-medium", styles.text)}>
                        {event.title}
                      </p>
                    </div>
                  );
                })}
                {getDayEvents(selectedDate).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No events scheduled for this date
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}