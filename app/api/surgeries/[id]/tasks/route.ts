import { NextResponse } from 'next/server';
import { TaskManager } from '@/lib/task/task-manager';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskManager = new TaskManager();
    const tasks = await taskManager.getTaskTimeline(params.id);
    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskManager = new TaskManager();
    const tasks = await taskManager.createTaskChain(params.id);
    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create tasks' },
      { status: 500 }
    );
  }
}