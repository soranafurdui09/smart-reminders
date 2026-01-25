import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

export type SpeechStatus =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'transcribing'
  | 'processing'
  | 'parsing'
  | 'creating'
  | 'success'
  | 'error';

type Completeness = { complete: boolean; missing: string[] };

type UseSpeechToReminderOptions<TParsed> = {
  lang?: string;
  autoStart?: boolean;
  useAi?: boolean;
  parseText?: (text: string) => Promise<TParsed | null>;
  isComplete?: (parsed: TParsed) => Completeness;
  onParsed?: (parsed: TParsed) => void;
  onIncomplete?: (parsed: TParsed, missing: string[]) => void;
  onCreate?: (parsed: TParsed) => void;
  onFallback?: (text: string) => void;
  onError?: (message: string) => void;
};

export function useSpeechToReminder<TParsed>({
  lang = 'ro-RO',
  autoStart = false,
  useAi = true,
  parseText,
  isComplete,
  onParsed,
  onIncomplete,
  onCreate,
  onFallback,
  onError
}: UseSpeechToReminderOptions<TParsed>) {
  const {
    supported,
    listening,
    transcript,
    error: speechError,
    start: startSpeech,
    stop: stopSpeech,
    reset: resetSpeech
  } = useSpeechToText(lang);
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const committedTranscriptRef = useRef('');
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || !supported) return;
    autoStartedRef.current = true;
    const startNow = () => {
      resetSpeech();
      setError(null);
      setStatus('starting');
      committedTranscriptRef.current = '';
      startSpeech();
    };
    const hasActivation =
      typeof navigator !== 'undefined'
      && 'userActivation' in navigator
      && (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive;
    const hasRecentHandoff = () => {
      if (typeof window === 'undefined') return false;
      try {
        const raw = window.sessionStorage.getItem('voice_handoff_ts');
        if (!raw) return false;
        const ts = Number(raw);
        if (!Number.isFinite(ts)) return false;
        const recent = Date.now() - ts < 8000;
        if (recent) {
          window.sessionStorage.removeItem('voice_handoff_ts');
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };
    if (!hasActivation && !hasRecentHandoff() && typeof window !== 'undefined') {
      const handle = () => startNow();
      window.addEventListener('pointerdown', handle, { once: true });
      window.addEventListener('keydown', handle, { once: true });
      return () => {
        window.removeEventListener('pointerdown', handle);
        window.removeEventListener('keydown', handle);
      };
    }
    startNow();
  }, [autoStart, resetSpeech, startSpeech, supported]);

  useEffect(() => {
    if (!listening) return;
    setStatus(transcript ? 'transcribing' : 'listening');
  }, [listening, transcript]);

  useEffect(() => {
    if (!speechError) return;
    setError(speechError);
    setStatus('error');
    onError?.(speechError);
  }, [onError, speechError]);

  useEffect(() => {
    if (listening) return;
    if (speechError) return;
    const finalTranscript = transcript.trim();
    if (!finalTranscript || finalTranscript === committedTranscriptRef.current) {
      if (status === 'listening' || status === 'transcribing' || status === 'processing') {
        setStatus('idle');
      }
      return;
    }
    committedTranscriptRef.current = finalTranscript;

    setStatus('processing');
    if (!useAi || !parseText) {
      setStatus('idle');
      onFallback?.(finalTranscript);
      return;
    }

    const runParse = async () => {
      const parsed = await parseText(finalTranscript);
      if (!parsed) {
        setStatus('error');
        const message = 'parse-failed';
        setError(message);
        onError?.(message);
        return;
      }
      onParsed?.(parsed);
      const completeness = isComplete?.(parsed) ?? { complete: true, missing: [] };
      if (!completeness.complete) {
        setStatus('idle');
        onIncomplete?.(parsed, completeness.missing);
        return;
      }
      setStatus('creating');
      onCreate?.(parsed);
    };
    void runParse();
  }, [
    isComplete,
    listening,
    onCreate,
    onError,
    onFallback,
    onIncomplete,
    onParsed,
    parseText,
    speechError,
    status,
    transcript,
    useAi
  ]);

  const start = useCallback(() => {
    if (!supported) {
      setError('not-supported');
      onError?.('not-supported');
      return;
    }
    if (listening) return;
    resetSpeech();
    setError(null);
    setStatus('starting');
    committedTranscriptRef.current = '';
    startSpeech();
  }, [listening, onError, resetSpeech, startSpeech, supported]);

  const stop = useCallback(() => {
    if (!listening) return;
    stopSpeech();
  }, [listening, stopSpeech]);

  const reset = useCallback(() => {
    resetSpeech();
    setError(null);
    setStatus('idle');
    committedTranscriptRef.current = '';
  }, [resetSpeech]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    start();
  }, [listening, start, stop]);

  return useMemo(
    () => ({
      supported,
      listening,
      transcript,
      error,
      status,
      start,
      stop,
      toggle,
      reset
    }),
    [supported, listening, transcript, error, status, start, stop, toggle, reset]
  );
}
