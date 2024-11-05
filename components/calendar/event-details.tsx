"use client";

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EVENT_TYPES, EventType } from '@/types/calendar';
import { Clock, MapPin, Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  type: keyof typeof EVENT_TYPES;
  start: Date;
  end: Date;
  location: string;
  notes?: string;
}

interface EventDetailsProps {
  event: Event;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EventDetails({ event, onEdit, onDelete }: EventDetailsProps) {
  const eventType = EVENT_TYPES[event.type];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            style={{
              backgroundColor: `${eventType.color}20`,
              color: eventType.color,
            }}
          >
            {eventType.name}
          </Badge>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>{eventType.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 text-sm">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{format(event.start, 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{event.location}</span>
        </div>
        {event.notes && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground">{event.notes}</p>
          </div>
        )}
      </CardContent>
      {eventType.requiresAnesthesiologist && (
        <CardFooter>
          <div className="w-full p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This procedure requires an anesthesiologist.
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}