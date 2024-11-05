"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ConnectCalendar } from './connect-calendar';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CalendarStatusProps {
  userId: string;
}

interface CalendarCredentials {
  access_token: string;
  expiry_date: string;
}

export function CalendarStatus({ userId }: CalendarStatusProps) {
  const [credentials, setCredentials] = useState<CalendarCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCalendarStatus();
  }, [userId]);

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch(`/api/calendar/tokens?userId=${userId}`);
      const data = await response.json();
      
      if (response.ok && data.data) {
        setCredentials(data.data);
      }
    } catch (error) {
      console.error('Error fetching calendar status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/calendar/tokens', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        setCredentials(null);
        toast({
          title: "Success",
          description: "Calendar disconnected successfully",
        });
      } else {
        throw new Error('Failed to disconnect calendar');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect calendar",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 animate-spin" />
            <span>Checking calendar status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Calendar Integration</CardTitle>
      </CardHeader>
      <CardContent>
        {credentials ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Calendar connected</span>
            </div>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="w-full sm:w-auto"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Disconnect Calendar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-yellow-600">
              <Calendar className="w-5 h-5" />
              <span>Calendar not connected</span>
            </div>
            <ConnectCalendar userId={userId} onSuccess={fetchCalendarStatus} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}