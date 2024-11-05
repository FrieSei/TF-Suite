"use client";

import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, History, Edit, Eye } from 'lucide-react';
import { NoteHistoryDialog } from './note-history-dialog';
import { EditModeDialog } from './edit-mode-dialog';
import { cn } from '@/lib/utils';

interface ClinicalNoteCardProps {
  note: {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
    isLocked: boolean;
    version: number;
    surgeon: {
      name: string;
    };
  };
  onEdit: (noteId: string, content: string, editReason?: string) => Promise<void>;
}

export function ClinicalNoteCard({ note, onEdit }: ClinicalNoteCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);

  return (
    <Card className={cn(
      "transition-colors",
      note.isLocked && "bg-muted/50 border-muted"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">
            {note.surgeon.name}
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{format(new Date(note.created_at), 'PPpp')}</span>
            {note.isLocked && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
            {note.version > 1 && (
              <Badge variant="outline" className="flex items-center gap-1">
                v{note.version}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(true)}
            title="View History"
          >
            <History className="h-4 w-4" />
          </Button>
          {note.isLocked ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditMode(true)}
              title="Enter Edit Mode"
            >
              <Edit className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditMode(true)}
              title="Edit Note"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose dark:prose-invert max-w-none">
          {note.content}
        </div>
      </CardContent>

      <NoteHistoryDialog
        noteId={note.id}
        open={showHistory}
        onOpenChange={setShowHistory}
      />

      <EditModeDialog
        note={note}
        open={showEditMode}
        onOpenChange={setShowEditMode}
        onSave={onEdit}
      />
    </Card>
  );
}