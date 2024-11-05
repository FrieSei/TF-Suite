"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { supabaseAdmin } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  role: z.enum(["surgeon", "backoffice"] as const),
  location: z.enum(["Vienna", "Linz", "Munich"] as const),
});

interface InviteFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function InviteForm({ onSuccess, className }: InviteFormProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "surgeon",
      location: "Vienna",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setStatus('loading');
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        values.email,
        {
          data: { 
            role: values.role,
            location: values.location
          },
        }
      );

      if (error) throw error;

      setStatus('success');
      setMessage(`Invitation sent successfully to ${values.email}`);
      form.reset();
      
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${values.email}`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || "Failed to send invitation");
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setStatus('idle');
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Invite New User</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="doctor@clinicflow.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="surgeon">Surgeon</SelectItem>
                      <SelectItem value="backoffice">Back Office</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Vienna">Vienna</SelectItem>
                      <SelectItem value="Linz">Linz</SelectItem>
                      <SelectItem value="Munich">Munich</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {status === 'error' && (
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {status === 'success' && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              {onSuccess && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSuccess}
                  disabled={status === 'loading'}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={status === 'loading'} className="w-full">
                {status === 'loading' ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}