"use client";

import { useEffect, useState } from 'react';
import { ClinicalNoteCard } from './clinical-note-card';
import { NoteFilters } from './note-filters';
import { isWithinInterval } from 'date-fns';

interface ClinicalNoteListProps {
  notes: any[];
  onEdit: (noteId: string, content: string, editReason?: string) => Promise<void>;
}

export function ClinicalNoteList({ notes, onEdit }: ClinicalNoteListProps) {
  const [filteredNotes, setFilteredNotes] = useState(notes);
  const [filters, setFilters] = useState({
    tags: [] as string[],
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined
    }
  });

  useEffect(() => {
    const filtered = notes.filter(note => {
      // Filter by tags
      if (filters.tags.length > 0) {
        const noteTags = note.metadata?.tags || [];
        if (!filters.tags.some(tag => noteTags.includes(tag))) {
          return false;
        }
      }

      // Filter by date range
      if (filters.dateRange.from || filters.dateRange.to) {
        const noteDate = new Date(note.created_at);
        if (filters.dateRange.from && filters.dateRange.to) {
          return isWithinInterval(noteDate, {
            start: filters.dateRange.from,
            end: filters.dateRange.to
          });
        } else if (filters.dateRange.from) {
          return noteDate >= filters.dateRange.from;
        } else if (filters.dateRange.to) {
          return noteDate <= filters.dateRange.to;
        }
      }

      return true;
    });

    setFilteredNotes(filtered);
  }, [notes, filters]);

  return (
    <div className="space-y-6">
      <NoteFilters onFilterChange={setFilters} />
      
      <div className="space-y-4">
        {filteredNotes.map((note) => (
          <ClinicalNoteCard
            key={note.id}
            note={note}
            onEdit={onEdit}
          />
        ))}
        {filteredNotes.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No notes found matching the selected filters.
          </p>
        )}
      </div>
    </div>
  );
}