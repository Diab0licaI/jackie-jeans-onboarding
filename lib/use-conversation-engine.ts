
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSpeech } from "./use-speech";
import {
  QUIZ_QUESTIONS,
  QuizAnswers,
  QuizQuestion,
  TOTAL_STEPS,
} from "./quiz-data";
import { parseAnswerForQuestion, isSkipIntent } from "./voice-parser";

export type ConversationPhase =
  | "intro"
  | "asking"
  | "listening"
  | "confirming"
  | "clarifying"
  | "done";

export interface ConversationLogEntry {
  speaker: "ai" | "user";
  text: string;
}

function confirmationLine(question: QuizQuestion, value: unknown): string {
  switch (question.id) {
    case "height":
      return `Got it - ${value}.`;
    case "weight":
      return value === null
        ? "No problem, we'll skip that."
        : `Got it - ${value} kilograms.`;
    case "waist":
      return `Perfect - ${value} inch waist.`;
    case "hip":
      return `Great - ${value} inch hip.`;
    case "waistFit":
      return `Got it - ${String(value).replace("-", " ")} at the waist.`;
    case "rise":
      return `${String(value).replace("-", " ")}, noted.`;
    case "thighFit":
      return `Got it - ${value} through the thighs.`;
    case "brands": {
      const brands = value as string[];
      return brands.length
        ? `Nice - ${brands.join(", ")}.`
        : "Got it, no brands yet.";
    }
    case "frustration":
      return `Thanks for sharing that.`;
    default:
      return "Got it.";
  }
}

function brandSizePrompt(brand: string): string {
  return `What size do you usually wear in ${brand}?`;
}

export function useConversationEngine() {
  const speech = useSpeech();
  const [phase, setPhase] = useState<ConversationPhase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [log, setLog] = useState<ConversationLogEntry[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  const [brandSizeQueue, setBrandSizeQueue] = useState<string[]>([]);
  const [currentBrandIndex, setCurrentBrandIndex] = useState(0);
  const phaseRef = useRef(phase);
  const stepIndexRef = useRef(stepIndex);
  const answersRef = useRef(answers);
  const retryCountRef = useRef(retryCount);
  const brandSizeQueueRef = useRef(brandSizeQueue);
  const currentBrandIndexRef = useRef(currentBrandIndex);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { retryCountRef.current = retryCount; }, [retryCount]);
  useEffect(() => { brandSizeQueueRef.current = brandSizeQueue; }, [brandSizeQueue]);
  useEffect(() => { currentBrandIndexRef.current = currentBrandIndex; }, [currentBrandIndex]);

  const pushLog = useCallback((entry: ConversationLogEntry) => {
    setLog((prev) => [...prev, entry]);
  }, []);

  const advance = useCallback(() => {
    const isLast = stepIndexRef.current === QUIZ_QUESTIONS.length - 1;
    if (isLast) {
      setPhase("done");
      return;
    }
    setRetryCount(0);
    setPhase("asking");
  }, []);

  
  const askQuestion = useCallback(
    (idx: number) => {
      const q = QUIZ_QUESTIONS[idx];
      setPhase("asking");

      if (q.type === "brand-size-followup") {
        const brands = (answersRef.current.brands as string[]) ?? [];
        if (brands.length === 0) {
          const msg = "No brands to size up - moving on.";
          pushLog({ speaker: "ai", text: msg });
          speech.speak(msg, advance);
          return;
        }
        setBrandSizeQueue(brands);
        setCurrentBrandIndex(0);
        const prompt = brandSizePrompt(brands[0]);
        pushLog({ speaker: "ai", text: prompt });
        speech.speak(prompt, () => {
          setPhase("listening");
          speech.startListening();
        });
        return;
      }

      const prompt = q.voicePrompt;
      pushLog({ speaker: "ai", text: prompt });
      speech.speak(prompt, () => {
        setPhase("listening");
        speech.startListening();
      });
    },
    [advance, pushLog, speech]
  );

  const handleBrandSizeAnswer = useCallback(
    (rawText: string) => {
      const queue = brandSizeQueueRef.current;
      const idx = currentBrandIndexRef.current;
      const brand = queue[idx];
      const sizeGuess = rawText.match(/\d+/)?.[0] ?? rawText.trim();

      setAnswers((prev) => ({
        ...prev,
        brandSizes: { ...(prev.brandSizes ?? {}), [brand]: sizeGuess },
      }));
      pushLog({ speaker: "ai", text: `Got it - ${sizeGuess} in ${brand}.` });

      const nextIdx = idx + 1;
      if (nextIdx < queue.length) {
        setCurrentBrandIndex(nextIdx);
        const nextPrompt = brandSizePrompt(queue[nextIdx]);
        pushLog({ speaker: "ai", text: nextPrompt });
        speech.speak(`Got it. ${nextPrompt}`, () => {
          setPhase("listening");
          speech.startListening();
        });
      } else {
        speech.speak("Perfect, that's everything for sizing.", advance);
      }
    },
    [advance, pushLog, speech]
  );

  const handleTranscript = useCallback(
    (text: string) => {
      pushLog({ speaker: "user", text });

      const question = QUIZ_QUESTIONS[stepIndexRef.current];

      if (question.type === "brand-size-followup") {
        handleBrandSizeAnswer(text);
        speech.resetTranscript();
        return;
      }

      if (question.optional && isSkipIntent(text)) {
        setAnswers((prev) => ({ ...prev, [question.id]: null }));
        setPhase("confirming");
        speech.speak(confirmationLine(question, null), advance);
        speech.resetTranscript();
        return;
      }

      const parsed = parseAnswerForQuestion(question, text);
      const failed =
        parsed === null ||
        (question.type === "multi-select" &&
          Array.isArray(parsed) &&
          parsed.length === 0 &&
          !/\b(none|never|nothing|first time)\b/i.test(text));

      if (failed) {
        const nextRetry = retryCountRef.current + 1;
        setRetryCount(nextRetry);
        if (nextRetry >= 2) {
          setAnswers((prev) => ({ ...prev, [question.id]: null }));
          setPhase("confirming");
          const skipMsg = "No worries, let's move on.";
          pushLog({ speaker: "ai", text: skipMsg });
          speech.speak(skipMsg, advance);
          speech.resetTranscript();
          return;
        }
        setPhase("clarifying");
        const clarify = "Sorry, I didn't quite catch that - could you say that again?";
        pushLog({ speaker: "ai", text: clarify });
        speech.speak(clarify, () => {
          setPhase("listening");
          speech.startListening();
        });
        speech.resetTranscript();
        return;
      }

      setAnswers((prev) => ({ ...prev, [question.id]: parsed }));
      setPhase("confirming");
      const confirmText = confirmationLine(question, parsed);
      pushLog({ speaker: "ai", text: confirmText });
      speech.speak(confirmText, advance);
      speech.resetTranscript();
    },
    [advance, handleBrandSizeAnswer, pushLog, speech]
  );

  
  const pendingTranscriptRef = useRef<string | null>(null);

  useEffect(() => {
    if (phaseRef.current !== "listening") return;
    if (speech.isListening) return;
    const text = speech.transcript.trim();
    if (!text) return;
    pendingTranscriptRef.current = text; 
  }, [speech.isListening, speech.transcript]);

  useEffect(() => {
    const text = pendingTranscriptRef.current;
    if (!text) return;
    pendingTranscriptRef.current = null;
    handleTranscript(text);
  }, [speech.isListening, speech.transcript, handleTranscript]);

  
  useEffect(() => {
    const p = phaseRef.current;
    if (p === "intro" || p === "done") return;
    if (p === "confirming" || p === "clarifying") return;
    askQuestion(stepIndex);
    
  }, [stepIndex]);

  
  const start = useCallback(() => {
    askQuestion(0);
  }, [askQuestion]);

  const isLast = stepIndex === QUIZ_QUESTIONS.length - 1;

  return {
    phase,
    question: QUIZ_QUESTIONS[stepIndex],
    stepIndex,
    totalSteps: TOTAL_STEPS,
    answers,
    log,
    isLast,
    isSupported: speech.isSupported,
    isListening: speech.isListening,
    isSpeaking: speech.isSpeaking,
    liveTranscript: speech.interimTranscript || speech.transcript,
    start,
  };
}