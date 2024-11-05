"use client";

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface PatientHistoryProps {
  patientId: string;
  onAppointmentClick?: (appointmentId: string) => void;
  onNoteClick?: (noteId: string) => void;
}

export function PatientHistory({
  patientId,
  onAppointmentClick,
  onNoteClick
}: PatientHistoryProps) {
  const { data: timeline, isLoading } = useQuery({
    queryKey: ['patient-history', patientId],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/history`);
      if (!response.ok) throw new Error('Failed to fetch patient history');
      return response.json();
    }
  });

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="h-4 w-4" />;
      case 'NOTE':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleEntryClick = (entry: any) => {
    if (entry.source_type === 'APPOINTMENT') {
      onAppointmentClick?.(entry.source_id);
    } else {
      onNoteClick?.(entry.source_id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : timeline?.length > 0 ? (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {timeline.map((entry: any) => (
                <div
                  key={`${entry.source_type}-${entry.source_id}`}
                  className="relative pl-8 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="absolute left-2 top-2 p-1 rounded-full bg-background border">
                    {getEntryIcon(entry.source_type)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{entry.entry_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.entry_date), 'PPp')}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {entry.source_type === 'APPOINTMENT'
                        ? entry.additional_data.status
                        : 'Note'}
                    </Badge>
                  </div>
                  {entry.reference_list?.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {entry.reference_list.map((ref: any) => (
                        <Badge
                          key={ref.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {ref.type === 'APPOINTMENT' ? 'Appointment' : 'Note'} Reference
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No history available
          </p>
        )}
      </CardContent>
    </Card>
  );
}