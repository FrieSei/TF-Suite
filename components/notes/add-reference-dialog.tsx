"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

interface AddReferenceDialogProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddReferenceDialog({
  noteId,
  open,
  onOpenChange
}: AddReferenceDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['reference-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return { appointments: [], notes: [] };

      const response = await fetch(`/api/references/search?query=${debouncedQuery}`);
      if (!response.ok) throw new Error('Failed to search references');
      return response.json();
    },
    enabled: debouncedQuery.length > 0
  });

  const addReference = async (type: 'APPOINTMENT' | 'NOTE', targetId: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/notes/${noteId}/references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetId })
      });

      if (!response.ok) throw new Error('Failed to add reference');

      toast({
        title: "Success",
        description: "Reference added successfully",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add reference",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Reference</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search appointments or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults?.appointments?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Appointments</h3>
                  {searchResults.appointments.map((appointment: any) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => addReference('APPOINTMENT', appointment.id)}
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
                    </div>
                  ))}
                </div>
              )}

              {searchResults?.notes?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Notes</h3>
                  {searchResults.notes.map((note: any) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => addReference('NOTE', note.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {note.metadata.visitType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {debouncedQuery && !searchResults?.appointments?.length && !searchResults?.notes?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No results found
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}