"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ConnectCalendarProps {
  userId: string;
  onSuccess?: () => void;
}

export function ConnectCalendar({ userId, onSuccess }: ConnectCalendarProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Redirect to Google OAuth consent screen
      window.location.href = `/api/auth/google?userId=${userId}&returnTo=/settings`;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to connect calendar",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="w-full sm:w-auto"
    >
      <Calendar className="w-4 h-4 mr-2" />
      {isConnecting ? "Connecting..." : "Connect Google Calendar"}
    </Button>
  );
}