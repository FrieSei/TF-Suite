"use client";

import { useQuery } from '@tanstack/react-query';
import { ClinicalNoteEditor } from '@/components/notes/clinical-note-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function PatientNotesPage({ params }: { params: { id: string } }) {
  const { data: notes, isLoading } = useQuery({
    queryKey: ['patient-notes', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/notes?patientId=${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clinical Notes</h1>
      </div>

      <ClinicalNoteEditor
        patientId={params.id}
        surgeonId="current-surgeon-id" // Replace with actual surgeon ID
      />

      <div className="space-y-4">
        {notes?.map((note: any) => (
          <Card key={note.id}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {format(new Date(note.created_at), 'PPpp')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert">
                {note.content}
              </div>
              {note.attachments?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Attachments</h4>
                  <div className="flex flex-wrap gap-2">
                    {note.attachments.map((attachment: any) => (
                      <a
                        key={attachment.id}
                        href={`/api/notes/${note.id}/attachments/${attachment.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:text-blue-700"
                      >
                        {attachment.metadata.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}