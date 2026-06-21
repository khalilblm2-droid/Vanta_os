// =============================================================================
// VANTA OS — useVoiceInput Hook (Section 31)
// Native browser SpeechRecognition / webkitSpeechRecognition.
// Allows the merchant to dictate complex commands hands-free.
// =============================================================================

import { useEffect, useRef, useState, useCallback } from "react";

// Minimal type stubs — SpeechRecognition isn't in lib.dom.d.ts yet
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition ??
    null
  );
}

export interface UseVoiceInputResult {
  supported: boolean;
  listening: boolean;
  transcript: string;
  interimTranscript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  error: string | null;
}

export function useVoiceInput(lang: string = "en-US"): UseVoiceInputResult {
  const [supported] = useState<boolean>(() => getSpeechRecognition() !== null);
  const [listening, setListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        // Heuristic: last result is interim if it's not isFinal
        if (i === event.results.length - 1) {
          interimText = text;
        } else {
          finalText += text;
        }
      }
      if (finalText) {
        setTranscript((prev) => prev + finalText);
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      setError(event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, [lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start voice input");
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    start,
    stop,
    reset,
    error,
  };
}
