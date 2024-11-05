"use client";

import { MetricsCard } from "./metrics-card";
import { DashboardMetric } from "@/types";
import {
  Calendar,
  Users,
  Stethoscope,
  AlertCircle,
  Activity,
  Clock,
} from "lucide-react";

const metrics: DashboardMetric[] = [
  {
    title: "Today's Appointments",
    value: 12,
    description: "4 surgeries, 8 consultations",
    icon: Calendar,
  },
  {
    title: "Active Patients",
    value: 145,
    description: "+5 new this week",
    icon: Users,
  },
  {
    title: "Equipment Status",
    value: "98%",
    description: "2 items need maintenance",
    icon: Stethoscope,
  },
  {
    title: "Pending Tasks",
    value: 7,
    description: "3 high priority",
    icon: AlertCircle,
  },
  {
    title: "Staff on Duty",
    value: 8,
    description: "2 surgeons, 6 support staff",
    icon: Activity,
  },
  {
    title: "Next Available Slot",
    value: "14:30",
    description: "Consultation Room 2",
    icon: Clock,
  },
];

export function MetricsGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric, index) => (
        <MetricsCard key={index} metric={metric} />
      ))}
    </div>
  );
}