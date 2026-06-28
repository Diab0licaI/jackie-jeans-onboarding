"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type SpeechRecognitionType = typeof window extends undefined
  ? never
  : InstanceType<typeof window.SpeechRecognition>;

function getSpeechRecognition(): typeof window.SpeechRecognition | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
      .webkitSpeechRecognition
  );
}

/** Pick the fastest available en-US voice. Local (device) voices respond
 *  instantly; network voices add 1-3 s of latency on first call. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // 1. Local en-US voice (fastest)
  const localEN = voices.find((v) => v.lang.startsWith("en") && v.localService);
  if (localEN) return localEN;

  // 2. Any en-US voice
  const anyEN = voices.find((v) => v.lang.startsWith("en"));
  if (anyEN) return anyEN;

  // 3. Whatever's available
  return voices[0] ?? null;
}

export interface UseSpeechResult {
  isSupported: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, onDone?: () => void) => void;
  resetTranscript: () => void;
}

export function useSpeech(): UseSpeechResult {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isSupported] = useState(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    const hasTTS = typeof window !== "undefined" && "speechSynthesis" in window;
    return Boolean(SpeechRecognitionCtor) && hasTTS;
  });

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pre-warm: browsers load voices asynchronously and delay the first
  // utterance if nothing has been spoken yet. Speaking an empty string
  // + immediately cancelling kicks the engine without audible output.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const init = () => {
      voiceRef.current = pickVoice();
      // Silent pre-warm utterance
      const warmup = new SpeechSynthesisUtterance(" ");
      warmup.volume = 0;
      if (voiceRef.current) warmup.voice = voiceRef.current;
      window.speechSynthesis.speak(warmup);
    };

    // Voices may not be loaded yet on first render
    if (window.speechSynthesis.getVoices().length > 0) {
      init();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", init, { once: true });
    }

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", init);
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      if (finalText) {
        setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText));
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setInterimTranscript("");
    setIsListening(true);
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.15;   // slightly faster = snappier feel
    utterance.pitch = 1.05;
    utterance.lang = "en-US";

    // Use the pre-selected local voice if available
    if (!voiceRef.current) voiceRef.current = pickVoice();
    if (voiceRef.current) utterance.voice = voiceRef.current;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onDone?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onDone?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    speak,
    resetTranscript,
  };
}