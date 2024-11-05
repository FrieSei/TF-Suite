"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DEFAULT_NOTE_TAGS } from "@/types/note-tags";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Filter, Tag, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface NoteFiltersProps {
  onFilterChange: (filters: {
    tags: string[];
    dateRange: { from: Date | undefined; to: Date | undefined };
  }) => void;
}

export function NoteFilters({ onFilterChange }: NoteFiltersProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [date, setDate] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const handleTagToggle = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    onFilterChange({ tags: newTags, dateRange: date });
  };

  const handleDateChange = (newDate: { from: Date | undefined; to: Date | undefined }) => {
    setDate(newDate);
    onFilterChange({ tags: selectedTags, dateRange: newDate });
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setDate({ from: undefined, to: undefined });
    onFilterChange({ tags: [], dateRange: { from: undefined, to: undefined } });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Tag className="h-4 w-4 mr-2" />
            Tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px]">
          <div className="space-y-2">
            {DEFAULT_NOTE_TAGS.map(tag => (
              <div
                key={tag.id}
                className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-accent"
                onClick={() => handleTagToggle(tag.id)}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1">{tag.name}</span>
                {selectedTags.includes(tag.id) && (
                  <Badge variant="secondary">Selected</Badge>
                )}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {date.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              "Date Range"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {(selectedTags.length > 0 || date.from) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 px-2"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tagId => {
            const tag = DEFAULT_NOTE_TAGS.find(t => t.id === tagId);
            if (!tag) return null;
            return (
              <Badge
                key={tag.id}
                variant="outline"
                style={{
                  backgroundColor: `${tag.color}20`,
                  borderColor: tag.color,
                  color: tag.color
                }}
              >
                {tag.name}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}