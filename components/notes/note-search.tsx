"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { ClinicalNoteCard } from './clinical-note-card';
import { NoteFilters } from './note-filters';

interface NoteSearchProps {
  surgeonId: string;
  onEdit: (noteId: string, content: string, editReason?: string) => Promise<void>;
}

export function NoteSearch({ surgeonId, onEdit }: NoteSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    tags: [] as string[],
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined
    }
  });

  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['note-search', debouncedQuery, surgeonId, filters],
    queryFn: async () => {
      if (!debouncedQuery) return [];

      const params = new URLSearchParams({
        query: debouncedQuery,
        surgeonId
      });

      if (filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.dateRange.from) {
        params.append('dateFrom', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange.to) {
        params.append('dateTo', filters.dateRange.to.toISOString());
      }

      const response = await fetch(`/api/notes/search?${params}`);
      if (!response.ok) throw new Error('Failed to search notes');
      return response.json();
    },
    enabled: debouncedQuery.length > 0
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clinical notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1.5 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <NoteFilters onFilterChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : searchResults?.length > 0 ? (
        <div className="space-y-4">
          {searchResults.map((note: any) => (
            <ClinicalNoteCard
              key={note.id}
              note={note}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : searchQuery ? (
        <p className="text-center text-muted-foreground py-8">
          No notes found matching your search.
        </p>
      ) : null}
    </div>
  );
}