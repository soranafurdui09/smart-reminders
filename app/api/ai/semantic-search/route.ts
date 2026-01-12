import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { getOptionalEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let payload: { query?: string; householdId?: string; limit?: number };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const query = String(payload.query ?? '').trim();
  const householdId = String(payload.householdId ?? '').trim();
  const limitRaw = Number(payload.limit ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

  if (!query || !householdId) {
    return NextResponse.json({ error: 'Missing query or householdId.' }, { status: 400 });
  }

  if (!getOptionalEnv('OPENAI_API_KEY')) {
    return NextResponse.json({ error: 'AI is not configured.' }, { status: 500 });
  }

  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let embedding: number[];
  try {
    embedding = await generateEmbedding(query);
  } catch (error) {
    console.error('[embeddings] query failed', error);
    return NextResponse.json({ error: 'Failed to generate embedding.' }, { status: 500 });
  }

  const { data, error } = await supabase.rpc('match_reminders', {
    query_embedding: embedding,
    match_count: limit,
    match_household_id: householdId
  });

  if (error) {
    console.error('[ai] semantic search failed', error);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
