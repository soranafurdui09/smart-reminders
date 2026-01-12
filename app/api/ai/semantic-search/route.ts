import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { getOptionalEnv } from '@/lib/env';

export const runtime = 'nodejs';

const MIN_SIMILARITY = 0.45;

function normalizeSimilarity(distance: number) {
  const similarity = 1 - distance;
  if (!Number.isFinite(similarity)) {
    return 0;
  }
  return Math.min(1, Math.max(0, similarity));
}

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

  const semanticResults = (data ?? []).map((item: any) => {
    const similarity = normalizeSimilarity(Number(item.distance));
    return {
      id: item.id,
      title: item.title,
      notes: item.notes,
      dueAt: item.due_at,
      similarity
    };
  }).filter((item: any) => item.similarity >= MIN_SIMILARITY)
    .sort((a: any, b: any) => (b.similarity ?? 0) - (a.similarity ?? 0));

  const topScore = semanticResults[0]?.similarity ?? 0;

  if (semanticResults.length) {
    console.log('[ai-search] semantic', { query, count: semanticResults.length, topScore });
    return NextResponse.json({ results: semanticResults, isKeywordFallback: false });
  }

  const { data: keywordResults, error: keywordError } = await supabase
    .from('reminders')
    .select('id, title, notes, due_at, household_id')
    .eq('household_id', householdId)
    .or(`title.ilike.%${query}%,notes.ilike.%${query}%`)
    .order('due_at', { ascending: true })
    .limit(limit);

  if (keywordError) {
    console.error('[ai] keyword search failed', keywordError);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }

  const keywordPayload = (keywordResults ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    notes: item.notes,
    dueAt: item.due_at,
    similarity: null
  }));

  console.log('[ai-search] fallback', { query, count: keywordPayload.length, topScore });

  return NextResponse.json({
    results: keywordPayload,
    isKeywordFallback: keywordPayload.length > 0
  });
}
