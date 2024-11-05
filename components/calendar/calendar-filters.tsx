"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LocationType, AppointmentStatus } from "@/types/calendar";

interface CalendarFiltersProps {
  filters: {
    location?: LocationType;
    status?: AppointmentStatus;
    upcomingOnly: boolean;
  };
  onFilterChange: (filters: {
    location?: LocationType;
    status?: AppointmentStatus;
    upcomingOnly: boolean;
  }) => void;
}

export function CalendarFilters({ filters, onFilterChange }: CalendarFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px]">
        <Select
          value={filters.location}
          onValueChange={(value: LocationType) =>
            onFilterChange({ ...filters, location: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Vienna">Vienna</SelectItem>
            <SelectItem value="Linz">Linz</SelectItem>
            <SelectItem value="Munich">Munich</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Select
          value={filters.status}
          onValueChange={(value: AppointmentStatus) =>
            onFilterChange({ ...filters, status: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="upcoming"
          checked={filters.upcomingOnly}
          onCheckedChange={(checked) =>
            onFilterChange({ ...filters, upcomingOnly: checked })
          }
        />
        <Label htmlFor="upcoming">Show only upcoming</Label>
      </div>

      <Button
        variant="ghost"
        onClick={() =>
          onFilterChange({
            location: undefined,
            status: undefined,
            upcomingOnly: true
          })
        }
      >
        Reset Filters
      </Button>
    </div>
  );
}