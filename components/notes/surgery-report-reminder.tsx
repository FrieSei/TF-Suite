"use client";

import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SurgeryReportReminderProps {
  surgeonId: string;
  onCreateReport: (surgeryId: string) => void;
}

export function SurgeryReportReminder({
  surgeonId,
  onCreateReport
}: SurgeryReportReminderProps) {
  const { data: pendingReports } = useQuery({
    queryKey: ['pending-surgery-reports', surgeonId],
    queryFn: async () => {
      const response = await fetch(`/api/surgery-reports/pending?surgeonId=${surgeonId}`);
      if (!response.ok) throw new Error('Failed to fetch pending reports');
      return response.json();
    }
  });

  if (!pendingReports?.length) return null;

  return (
    <div className="space-y-4">
      {pendingReports.map((report: any) => (
        <Alert
          key={report.id}
          variant={report.isOverdue ? "destructive" : "default"}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Surgery Report Required</AlertTitle>
          <AlertDescription className="mt-2">
            <p>
              Surgery report for patient {report.patient.name} is{" "}
              {report.isOverdue ? "overdue" : "due"} in{" "}
              {formatDistanceToNow(new Date(report.report_due_date))}.
            </p>
            <p className="text-sm mt-1">
              Surgery Date: {format(new Date(report.surgery.surgery_date), "PPp")}
              <br />
              Due Date: {format(new Date(report.report_due_date), "PPp")}
            </p>
            <Button
              className="mt-2"
              size="sm"
              onClick={() => onCreateReport(report.surgery_id)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Create Surgery Report
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}