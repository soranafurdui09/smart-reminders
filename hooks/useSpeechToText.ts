import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionResult = {
  isFinal?: boolean;
  0?: { transcript?: string };
};

type SpeechRecognitionEvent = {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResult>;
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export interface UseSpeechToTextResult {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechToText(lang = 'ro-RO'): UseSpeechToTextResult {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const manualStopRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const silenceMs = 3000;
  const minWords = 4;

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = window.setTimeout(() => {
      manualStopRef.current = false;
      recognitionRef.current?.stop();
    }, silenceMs);
  }, [silenceMs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionCtor = (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }

    setSupported(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onstart = () => {
      setListening(true);
      resetSilenceTimer();
    };
    recognition.onend = () => {
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setListening(false);
      const combined = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
      const wordCount = combined.split(/\s+/).filter(Boolean).length;
      if (!manualStopRef.current && wordCount > 0 && wordCount < minWords) {
        setError('too-short');
      }
      if (!combined && !manualStopRef.current) {
        setError('no-speech');
      }
      setTranscript(combined);
      manualStopRef.current = false;
      interimTranscriptRef.current = '';
    };
    recognition.onerror = (event) => {
      setError(event?.error || 'unknown');
      setListening(false);
    };
    recognition.onresult = (event) => {
      let interim = '';
      let finalText = finalTranscriptRef.current;
      const startIndex = event.resultIndex ?? 0;
      for (let i = startIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? '';
        if (result?.isFinal) {
          finalText += text + ' ';
        } else {
          interim += text;
        }
      }
      finalTranscriptRef.current = finalText;
      interimTranscriptRef.current = interim;
      setTranscript(`${finalText}${interim}`.trim());
      resetSilenceTimer();
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [lang, resetSilenceTimer]);

  const start = useCallback(() => {
    if (!supported || listening) {
      if (!supported) {
        setError('not-supported');
      }
      return;
    }
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError('not-supported');
      return;
    }
    setError(null);
    setTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    manualStopRef.current = false;
    try {
      recognition.start();
    } catch {
      setError('start-failed');
      setListening(false);
    }
  }, [listening, supported]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
