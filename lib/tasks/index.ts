import { createServerClient } from '@/lib/supabase/server';

function logTaskError(scope: string, error: unknown) {
  console.error(`[tasks] ${scope} failed`, error);
}

export type TaskList = {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  created_at: string;
};

export type TaskItem = {
  id: string;
  list_id: string;
  owner_id: string;
  title: string;
  notes: string | null;
  qty: string | null;
  due_date: string | null;
  priority: string | null;
  done: boolean;
  done_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getOrCreateInboxList(userId: string) {
  const supabase = createServerClient();
  const { data: existing, error: existingError } = await supabase
    .from('task_lists')
    .select('id, owner_id, name, type, created_at')
    .eq('owner_id', userId)
    .eq('name', 'Inbox')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existingError) {
    logTaskError('getOrCreateInboxList select', existingError);
  }
  if (existing) {
    return existing as TaskList;
  }
  const { data: created, error: insertError } = await supabase
    .from('task_lists')
    .insert({ owner_id: userId, name: 'Inbox', type: 'generic' })
    .select('id, owner_id, name, type, created_at')
    .single();
  if (insertError) {
    logTaskError('getOrCreateInboxList insert', insertError);
    throw insertError;
  }
  return created as TaskList;
}

export async function getTaskLists(userId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('task_lists')
    .select('id, owner_id, name, type, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logTaskError('getTaskLists', error);
    return [];
  }
  return (data ?? []) as TaskList[];
}

export async function getTaskItemsForList(
  userId: string,
  listId: string,
  opts?: { status?: 'open' | 'done' | 'all' }
) {
  const supabase = createServerClient();
  let query = supabase
    .from('task_items')
    .select('id, list_id, owner_id, title, notes, qty, due_date, priority, done, done_at, created_at, updated_at')
    .eq('owner_id', userId)
    .eq('list_id', listId);
  const status = opts?.status ?? 'all';
  if (status === 'open') {
    query = query.eq('done', false);
  } else if (status === 'done') {
    query = query.eq('done', true);
  }
  const { data, error } = await query
    .order('done', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) {
    logTaskError('getTaskItemsForList', error);
    return [];
  }
  return (data ?? []) as TaskItem[];
}

export async function createTaskItem(
  userId: string,
  input: {
    listId?: string;
    title: string;
    notes?: string | null;
    qty?: string | null;
    dueDate?: string | null;
    priority?: string | null;
  }
) {
  const listId = input.listId ?? (await getOrCreateInboxList(userId)).id;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('task_items')
    .insert({
      list_id: listId,
      owner_id: userId,
      title: input.title,
      notes: input.notes ?? null,
      qty: input.qty ?? null,
      due_date: input.dueDate ?? null,
      priority: input.priority ?? null
    })
    .select('id, list_id, owner_id, title, notes, qty, due_date, priority, done, done_at, created_at, updated_at')
    .single();
  if (error) {
    logTaskError('createTaskItem', error);
    throw error;
  }
  return data as TaskItem;
}

export async function toggleTaskDone(userId: string, itemId: string, done: boolean) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('task_items')
    .update({
      done,
      done_at: done ? new Date().toISOString() : null
    })
    .eq('owner_id', userId)
    .eq('id', itemId)
    .select('id, list_id, owner_id, title, notes, qty, due_date, priority, done, done_at, created_at, updated_at')
    .single();
  if (error) {
    logTaskError('toggleTaskDone', error);
    throw error;
  }
  return data as TaskItem;
}

export async function updateTaskItem(
  userId: string,
  itemId: string,
  patch: {
    title?: string;
    notes?: string | null;
    qty?: string | null;
    due_date?: string | null;
    priority?: string | null;
  }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('task_items')
    .update(patch)
    .eq('owner_id', userId)
    .eq('id', itemId)
    .select('id, list_id, owner_id, title, notes, qty, due_date, priority, done, done_at, created_at, updated_at')
    .single();
  if (error) {
    logTaskError('updateTaskItem', error);
    throw error;
  }
  return data as TaskItem;
}

export async function deleteTaskItem(userId: string, itemId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('task_items')
    .delete()
    .eq('owner_id', userId)
    .eq('id', itemId);
  if (error) {
    logTaskError('deleteTaskItem', error);
    throw error;
  }
}

export async function createTaskList(
  userId: string,
  input: { name: string; type?: 'generic' | 'shopping' }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('task_lists')
    .insert({
      owner_id: userId,
      name: input.name,
      type: input.type ?? 'generic'
    })
    .select('id, owner_id, name, type, created_at')
    .single();
  if (error) {
    logTaskError('createTaskList', error);
    throw error;
  }
  return data as TaskList;
}

export async function deleteTaskList(userId: string, listId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('task_lists')
    .delete()
    .eq('owner_id', userId)
    .eq('id', listId);
  if (error) {
    logTaskError('deleteTaskList', error);
    throw error;
  }
}
