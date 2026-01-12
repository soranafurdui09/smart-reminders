import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.0";

type ReminderRow = {
  id: string;
  title: string | null;
  notes: string | null;
  tags?: string[] | null;
};

type EmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_EMBEDDING_MODEL = Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN") ?? "";

const BATCH_SIZE = 100;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function buildInput(reminder: ReminderRow) {
  const title = String(reminder.title ?? "").trim();
  const notes = String(reminder.notes ?? "").trim();
  const tags = Array.isArray(reminder.tags) ? reminder.tags.join(" ") : "";
  return [title, notes, tags].filter(Boolean).join("\n");
}

async function getEmbedding(input: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model: OPENAI_EMBEDDING_MODEL, input })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embedding request failed: ${text}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("Embedding response missing data");
  }
  return embedding;
}

serve(async (request) => {
  if (!ADMIN_TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "server-misconfigured" }), { status: 500 });
  }

  const authHeader = request.headers.get("x-admin-token");
  if (!authHeader || authHeader !== ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  let forceAll = false;
  if (request.method === "POST") {
    try {
      const body = await request.json();
      forceAll = Boolean(body?.forceAll);
    } catch {
      // ignore
    }
  }
  const url = new URL(request.url);
  const forceParam = url.searchParams.get("forceAll");
  if (forceParam === "true" || forceParam === "1") {
    forceAll = true;
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "missing-openai-key" }), { status: 500 });
  }

  let updatedCount = 0;
  let lastId: string | null = null;

  while (true) {
    let query = supabase
      .from("reminders")
      .select("id,title,notes,tags")
      .order("id")
      .limit(BATCH_SIZE);

    if (!forceAll) {
      query = query.is("embedding", null);
    }

    if (lastId) {
      query = query.gt("id", lastId);
    }

    const { data, error } = await query;
    if (error) {
      console.log("[backfill] fetch error", error);
      return new Response(JSON.stringify({ error: "fetch-failed" }), { status: 500 });
    }

    const reminders = (data ?? []) as ReminderRow[];
    if (!reminders.length) {
      break;
    }

    for (const reminder of reminders) {
      const input = buildInput(reminder);
      if (!input) {
        lastId = reminder.id;
        continue;
      }
      try {
        const embedding = await getEmbedding(input);
        const { error: updateError } = await supabase
          .from("reminders")
          .update({ embedding })
          .eq("id", reminder.id);
        if (updateError) {
          console.log("[backfill] update error", reminder.id, updateError);
        } else {
          updatedCount += 1;
        }
      } catch (err) {
        console.log("[backfill] embedding error", reminder.id, err?.message ?? err);
      }
      lastId = reminder.id;
    }

    console.log("[backfill] batch complete", { lastId, updatedCount });
  }

  return new Response(
    JSON.stringify({ status: "ok", updatedCount, forceAll }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
