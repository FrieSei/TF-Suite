"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AddReferenceDialog } from './add-reference-dialog';

interface NoteReferencesProps {
  noteId: string;
  onAppointmentClick?: (appointmentId: string) => void;
  onNoteClick?: (noteId: string) => void;
}

export function NoteReferences({
  noteId,
  onAppointmentClick,
  onNoteClick
}: NoteReferencesProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ['note-appointments', noteId],
    queryFn: async () => {
      const response = await fetch(`/api/notes/${noteId}/appointments`);
      if (!response.ok) throw new Error('Failed to fetch related appointments');
      return response.json();
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">References</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Reference
        </Button>
      </CardHeader>
      <CardContent>
        {loadingAppointments ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : appointments?.length > 0 ? (
          <div className="space-y-2">
            {appointments.map((appointment: any) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => onAppointmentClick?.(appointment.id)}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {appointment.event_type.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointment.start_time), 'PPp')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{appointment.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No references added yet
          </p>
        )}
      </CardContent>

      <AddReferenceDialog
        noteId={noteId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </Card>
  );
}