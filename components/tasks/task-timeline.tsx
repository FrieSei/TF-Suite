"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Task, TaskStatus, TaskPriority } from "@/types/task";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlayCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TaskTimelineProps {
  surgeryId: string;
}

export function TaskTimeline({ surgeryId }: TaskTimelineProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [surgeryId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/surgeries/${surgeryId}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.tasks);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, status: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update task');

      await fetchTasks();
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case TaskStatus.IN_PROGRESS:
        return <PlayCircle className="h-5 w-5 text-blue-500" />;
      case TaskStatus.BLOCKED:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case TaskStatus.OVERDUE:
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const variants = {
      [TaskPriority.LOW]: "secondary",
      [TaskPriority.MEDIUM]: "default",
      [TaskPriority.HIGH]: "warning",
      [TaskPriority.URGENT]: "destructive"
    };

    return (
      <Badge variant={variants[priority]}>
        {priority.toLowerCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Timeline</CardTitle>
        <CardDescription>
          Track and manage pre-surgery tasks and requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start space-x-4 border-l-2 pl-4 pb-6 last:pb-0"
              style={{
                borderColor:
                  task.status === TaskStatus.COMPLETED
                    ? "#22c55e"
                    : task.status === TaskStatus.OVERDUE
                    ? "#f97316"
                    : "#e5e7eb",
              }}
            >
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(task.status)}
              </div>
              <div className="flex-grow space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPriorityBadge(task.priority)}
                    <div className="text-sm text-muted-foreground">
                      Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                {task.status !== TaskStatus.COMPLETED && (
                  <div className="flex space-x-2">
                    {task.status === TaskStatus.PENDING && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStatusUpdate(task.id, TaskStatus.IN_PROGRESS)
                        }
                      >
                        Start Task
                      </Button>
                    )}
                    {task.status === TaskStatus.IN_PROGRESS && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStatusUpdate(task.id, TaskStatus.COMPLETED)
                        }
                      >
                        Complete Task
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}