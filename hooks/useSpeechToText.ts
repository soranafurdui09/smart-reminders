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
  const noSpeechTimerRef = useRef<number | null>(null);
  const warmupRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const manualStopRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const silenceMs = 3000;
  const noSpeechMs = 8000;
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

  const playReadyTone = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    let ctx = audioContextRef.current;
    if (!ctx) {
      ctx = new AudioContextCtor();
      audioContextRef.current = ctx;
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
  }, []);

  const playStopTone = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    let ctx = audioContextRef.current;
    if (!ctx) {
      ctx = new AudioContextCtor();
      audioContextRef.current = ctx;
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 620;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }, []);

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
      playReadyTone();
      if (noSpeechTimerRef.current) {
        window.clearTimeout(noSpeechTimerRef.current);
      }
      noSpeechTimerRef.current = window.setTimeout(() => {
        manualStopRef.current = false;
        recognitionRef.current?.stop();
      }, noSpeechMs);
    };
    recognition.onend = () => {
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (noSpeechTimerRef.current) {
        window.clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }
      setListening(false);
      playStopTone();
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
      if (noSpeechTimerRef.current) {
        window.clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }
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
      if (noSpeechTimerRef.current) {
        window.clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [lang, playReadyTone, playStopTone, resetSilenceTimer]);

  const warmUpMicrophone = useCallback(async () => {
    if (warmupRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      warmupRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      warmupRef.current = false;
      throw err;
    }
  }, []);

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
    const run = async () => {
      try {
        await warmUpMicrophone();
        recognition.start();
      } catch (err) {
        const errorName =
          err && typeof err === 'object' && 'name' in err
            ? String((err as { name?: string }).name)
            : '';
        if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
          setError('not-allowed');
        } else {
          setError('start-failed');
        }
        setListening(false);
      }
    };
    void run();
  }, [listening, supported, warmUpMicrophone]);

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
