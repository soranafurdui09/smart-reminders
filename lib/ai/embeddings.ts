import { getOptionalEnv } from '@/lib/env';

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
};

// Embeddings use OpenAI text-embedding-3-small (1536 dimensions).
// Keep reminder text consistent across create/update/search.
export function buildReminderEmbeddingInput(title: string, notes?: string | null, tags?: string[] | null) {
  const tagText = tags?.length ? tags.join(' ') : '';
  const parts = [title.trim(), (notes || '').trim(), tagText.trim()].filter(Boolean);
  return parts.join('\n');
}

export async function generateEmbedding(input: string) {
  const apiKey = getOptionalEnv('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }
  const model = getOptionalEnv('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding request failed: ${errorText}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('Embedding response missing data');
  }
  return embedding;
}

export async function generateReminderEmbedding(title: string, notes?: string | null, tags?: string[] | null) {
  const input = buildReminderEmbeddingInput(title, notes, tags);
  if (!input) {
    return null;
  }
  return generateEmbedding(input);
}
