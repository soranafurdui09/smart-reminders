'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import {
  createTaskItem,
  deleteTaskItem,
  toggleTaskDone,
  updateTaskItem
} from '@/lib/tasks';

export async function createTaskItemAction(input: {
  listId?: string;
  title: string;
  dueDate?: string | null;
  notes?: string | null;
  qty?: string | null;
  priority?: string | null;
}) {
  const user = await requireUser('/app/tasks');
  const item = await createTaskItem(user.id, {
    listId: input.listId,
    title: input.title,
    notes: input.notes,
    qty: input.qty,
    dueDate: input.dueDate,
    priority: input.priority
  });
  revalidatePath('/app/tasks');
  if (item.list_id) {
    revalidatePath(`/app/lists/${item.list_id}`);
  }
  return item;
}

export async function toggleTaskDoneAction(itemId: string, done: boolean) {
  const user = await requireUser('/app/tasks');
  const item = await toggleTaskDone(user.id, itemId, done);
  revalidatePath('/app/tasks');
  revalidatePath(`/app/lists/${item.list_id}`);
  return item;
}

export async function updateTaskItemAction(itemId: string, patch: {
  title?: string;
  notes?: string | null;
  qty?: string | null;
  due_date?: string | null;
  priority?: string | null;
}) {
  const user = await requireUser('/app/tasks');
  const item = await updateTaskItem(user.id, itemId, patch);
  revalidatePath('/app/tasks');
  revalidatePath(`/app/lists/${item.list_id}`);
  return item;
}

export async function deleteTaskItemAction(itemId: string, listId?: string) {
  const user = await requireUser('/app/tasks');
  await deleteTaskItem(user.id, itemId);
  revalidatePath('/app/tasks');
  if (listId) {
    revalidatePath(`/app/lists/${listId}`);
  }
}
