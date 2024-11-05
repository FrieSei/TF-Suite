"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Procedure {
  time: string;
  patient: string;
  procedure: string;
  surgeon: string;
}

const procedures: Procedure[] = [
  {
    time: "09:00",
    patient: "Sarah Johnson",
    procedure: "Rhinoplasty",
    surgeon: "Dr. Weber",
  },
  {
    time: "11:30",
    patient: "Michael Chen",
    procedure: "Botox Treatment",
    surgeon: "Dr. Mueller",
  },
  {
    time: "14:00",
    patient: "Emma Davis",
    procedure: "Consultation",
    surgeon: "Dr. Schmidt",
  },
];

export function UpcomingProcedures() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Procedures</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {procedures.map((appointment, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0"
            >
              <div className="flex items-center space-x-4">
                <div className="font-medium">{appointment.time}</div>
                <div>
                  <div className="font-medium">{appointment.patient}</div>
                  <div className="text-sm text-muted-foreground">
                    {appointment.procedure}
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {appointment.surgeon}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}