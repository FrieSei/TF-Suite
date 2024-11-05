"use client";

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertTriangle } from 'lucide-react';

const formSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty'),
  editReason: z.string().optional(),
});

interface EditModeDialogProps {
  note: {
    id: string;
    content: string;
    isLocked: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (noteId: string, content: string, editReason?: string) => Promise<void>;
}

export function EditModeDialog({
  note,
  open,
  onOpenChange,
  onSave,
}: EditModeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: note.content,
      editReason: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      await onSave(note.id, values.content, values.editReason);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {note.isLocked ? 'Edit Locked Note' : 'Edit Note'}
          </DialogTitle>
          {note.isLocked && (
            <DialogDescription>
              This note is locked. Please provide a reason for editing.
            </DialogDescription>
          )}
        </DialogHeader>

        {note.isLocked && (
          <Alert className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are editing a locked note. This action will be audited.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Content</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[200px] font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {note.isLocked && (
              <FormField
                control={form.control}
                name="editReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Edit</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please provide a reason for editing this locked note..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {note.isLocked && <Lock className="h-4 w-4" />}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}