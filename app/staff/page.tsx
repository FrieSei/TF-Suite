"use client";

import { useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffList } from "@/components/staff/staff-list";
import { StaffForm } from "@/components/staff/staff-form";
import { InviteForm } from "@/components/staff/invite-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function StaffPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <StaffList />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="invite" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite">Send Invitation</TabsTrigger>
              <TabsTrigger value="create">Create Account</TabsTrigger>
            </TabsList>
            <TabsContent value="invite">
              <InviteForm onSuccess={() => setIsModalOpen(false)} />
            </TabsContent>
            <TabsContent value="create">
              <StaffForm onSuccess={() => setIsModalOpen(false)} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}