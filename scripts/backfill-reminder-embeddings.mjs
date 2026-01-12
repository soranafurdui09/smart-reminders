import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!openaiKey) {
  console.error('Missing OPENAI_API_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const batchSize = 50;
let processed = 0;

const buildInput = (title, notes) => {
  const parts = [String(title || '').trim(), String(notes || '').trim()].filter(Boolean);
  return parts.join('\n');
};

const getEmbedding = async (input) => {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, input })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embedding request failed: ${text}`);
  }
  const payload = await response.json();
  const embedding = payload?.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('Embedding response missing data');
  }
  return embedding;
};

while (true) {
  const { data, error } = await supabase
    .from('reminders')
    .select('id, title, notes')
    .is('embedding', null)
    .limit(batchSize);

  if (error) {
    console.error('Failed to fetch reminders', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    break;
  }

  for (const reminder of data) {
    const input = buildInput(reminder.title, reminder.notes);
    if (!input) {
      continue;
    }
    try {
      const embedding = await getEmbedding(input);
      const { error: updateError } = await supabase
        .from('reminders')
        .update({ embedding })
        .eq('id', reminder.id);
      if (updateError) {
        console.error('Update failed', reminder.id, updateError);
        continue;
      }
      processed += 1;
      console.log(`Embedded ${reminder.id}`);
    } catch (err) {
      console.error('Embedding failed', reminder.id, err?.message || err);
    }
  }
}

console.log(`Done. Embedded ${processed} reminders.`);
