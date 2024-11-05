"use client";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_NOTE_TAGS, NoteTag } from "@/types/note-tags";
import { useState } from "react";

interface NoteTagSelectProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export function NoteTagSelect({
  selectedTags,
  onTagsChange,
  className,
}: NoteTagSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleTag = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onTagsChange(newTags);
  };

  const getTagById = (id: string): NoteTag | undefined => {
    return DEFAULT_NOTE_TAGS.find(tag => tag.id === id);
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {selectedTags.map(tagId => {
        const tag = getTagById(tagId);
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
            className="cursor-pointer"
            onClick={() => toggleTag(tag.id)}
          >
            {tag.name}
            <Check className="ml-1 h-3 w-3" />
          </Badge>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 px-2"
          >
            <Tag className="mr-2 h-4 w-4" />
            Add Tags
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {DEFAULT_NOTE_TAGS.map(tag => (
                <CommandItem
                  key={tag.id}
                  value={tag.name}
                  onSelect={() => toggleTag(tag.id)}
                >
                  <div
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedTags.includes(tag.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}