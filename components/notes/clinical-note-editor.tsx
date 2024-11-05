"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceNoteRecorder } from './voice-note-recorder';
import { NoteTagSelect } from './note-tag-select';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { AppointmentMetadata } from '@/types/note-tags';

interface ClinicalNoteEditorProps {
  patientId: string;
  surgeonId: string;
  appointmentData?: AppointmentMetadata;
  initialContent?: string;
  onSave?: () => void;
}

export function ClinicalNoteEditor({
  patientId,
  surgeonId,
  appointmentData,
  initialContent = '',
  onSave
}: ClinicalNoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    appointmentData?.tags || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleTranscript = useCallback((transcript: string) => {
    setContent(prev => prev + ' ' + transcript);
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          surgeonId,
          content,
          metadata: {
            createdAt: new Date().toISOString(),
            type: 'clinical_note',
            appointmentId: appointmentData?.appointmentId,
            visitType: appointmentData?.visitType,
            tags: selectedTags
          }
        })
      });

      if (!response.ok) throw new Error('Failed to save note');

      toast({
        title: "Success",
        description: "Note saved successfully",
      });

      onSave?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save note",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        uploadedAt: new Date().toISOString()
      }));

      const response = await fetch(`/api/notes/${patientId}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload file');

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinical Note</CardTitle>
        {appointmentData && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            <span>
              {appointmentData.visitType} - {format(new Date(appointmentData.dateTime), 'PPp')}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <VoiceNoteRecorder 
            onTranscript={handleTranscript}
            isDisabled={isSaving}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isSaving}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx"
          />
        </div>

        <NoteTagSelect
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter clinical notes here..."
          className="min-h-[200px] font-mono"
          disabled={isSaving}
        />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Note
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}