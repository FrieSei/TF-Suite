"use client";

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface NoteHistoryDialogProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteHistoryDialog({
  noteId,
  open,
  onOpenChange,
}: NoteHistoryDialogProps) {
  const { data: versions, isLoading } = useQuery({
    queryKey: ['note-history', noteId],
    queryFn: async () => {
      const response = await fetch(`/api/notes/${noteId}/history`);
      if (!response.ok) throw new Error('Failed to fetch note history');
      return response.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Note History</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {versions?.map((version: any) => (
                <div
                  key={version.version}
                  className="space-y-2 border-b pb-4 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">v{version.version}</Badge>
                      <span className="text-sm text-muted-foreground">
                        by {version.created_by.name}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(version.created_at), 'PPpp')}
                    </span>
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    {version.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}