'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createTaskList, deleteTaskList } from '@/lib/tasks';

export async function createTaskListAction(input: { name: string; type?: 'generic' | 'shopping' }) {
  const user = await requireUser('/app/lists');
  const list = await createTaskList(user.id, {
    name: input.name,
    type: input.type ?? 'generic'
  });
  revalidatePath('/app/lists');
  return list;
}

export async function deleteTaskListAction(listId: string) {
  const user = await requireUser('/app/lists');
  await deleteTaskList(user.id, listId);
  revalidatePath('/app/lists');
}
