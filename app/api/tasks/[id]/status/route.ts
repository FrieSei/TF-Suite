import { NextResponse } from 'next/server';
import { TaskManager } from '@/lib/task/task-manager';
import { TaskStatus } from '@/types/task';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    
    if (!Object.values(TaskStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid task status' },
        { status: 400 }
      );
    }

    const taskManager = new TaskManager();
    await taskManager.updateTaskStatus(params.id, status);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update task status' },
      { status: 500 }
    );
  }
}