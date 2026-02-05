type AiDatetimeInput = {
  text: string;
  dueAt?: string | null;
  hasExplicitDatetime?: boolean | null;
  parsedDatetime?: string | null;
  parsedDatetimeConfidence?: number | null;
};

export type AiDatetimeMeta = {
  hasExplicitDatetime: boolean;
  parsedDatetime: string | null;
  parsedDatetimeConfidence: number;
};

const TIME_COLON_RE = /\b([01]?\d|2[0-3]):[0-5]\d\b/;
const AMPM_RE = /\b(1[0-2]|0?[1-9])\s*(am|pm)\b/i;
const HOUR_WORD_RE = /\b(?:ora|la|at|um)\s*([01]?\d|2[0-3])\b/i;

function hasExplicitTime(text: string) {
  if (!text) return false;
  return TIME_COLON_RE.test(text) || AMPM_RE.test(text) || HOUR_WORD_RE.test(text);
}

function normalizeDatetimeValue(value?: string | null) {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return '';
  return trimmed;
}

export function inferAiDatetimeMeta(input: AiDatetimeInput): AiDatetimeMeta {
  const explicitFromPayload = typeof input.hasExplicitDatetime === 'boolean' ? input.hasExplicitDatetime : null;
  const confidenceFromPayload =
    typeof input.parsedDatetimeConfidence === 'number' && Number.isFinite(input.parsedDatetimeConfidence)
      ? input.parsedDatetimeConfidence
      : null;
  const parsedDatetime = normalizeDatetimeValue(input.parsedDatetime);
  const dueAt = normalizeDatetimeValue(input.dueAt);
  const baseDatetime = parsedDatetime || dueAt;
  const explicitTime = hasExplicitTime(input.text);
  const baseHasExplicit = explicitFromPayload ?? (Boolean(baseDatetime) && explicitTime);
  const confidence = confidenceFromPayload ?? (baseHasExplicit ? 1 : 0);
  const isConfident = confidence >= 0.6;
  const hasExplicitDatetime = Boolean(baseHasExplicit && isConfident && baseDatetime);

  return {
    hasExplicitDatetime,
    parsedDatetime: hasExplicitDatetime ? baseDatetime : null,
    parsedDatetimeConfidence: confidence
  };
}
