// lib/use-conversation-engine.ts
//
// The state machine driving the AI Voice Onboarding flow.
// Phases per question: "asking" (AI speaks) -> "listening" (user speaks)
// -> "confirming" (AI repeats back what it heard) -> next question.
// If parsing fails, it speaks a polite re-ask and listens again.

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

  // Refs mirror state so callbacks always see the latest values without
  // needing them in dependency arrays (avoids stale-closure bugs and
  // exhaustive-deps warnings on intentionally-stable callbacks).
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

  // ── advance ──────────────────────────────────────────────────────────────
  // Moves to the next question or finishes the quiz.
  const advance = useCallback(() => {
    const isLast = stepIndexRef.current === QUIZ_QUESTIONS.length - 1;
    if (isLast) {
      setPhase("done");
      return;
    }
    setRetryCount(0);
    setPhase("asking"); // unblock the stepIndex effect
    setStepIndex((i) => i + 1);
  }, []);

  // ── askQuestion ──────────────────────────────────────────────────────────
  // Speaks the prompt for the given step index and starts listening.
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

  // ── handleBrandSizeAnswer ────────────────────────────────────────────────
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

  // ── handleTranscript ─────────────────────────────────────────────────────
  // Processes the final transcript after listening ends.
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
          // After 2 failed attempts, skip the question and move on
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

  // ── pending transcript ref ───────────────────────────────────────────────
  // We write the transcript here in the effect (no setState), then a second
  // effect picks it up asynchronously — satisfying react-hooks/set-state-in-effect.
  const pendingTranscriptRef = useRef<string | null>(null);

  useEffect(() => {
    if (phaseRef.current !== "listening") return;
    if (speech.isListening) return;
    const text = speech.transcript.trim();
    if (!text) return;
    pendingTranscriptRef.current = text; // write only — no setState
  }, [speech.isListening, speech.transcript]);

  // ── effect: process pending transcript ───────────────────────────────────
  // Reads the ref written above and calls handleTranscript outside the
  // effect that owns the Web Speech state, keeping setState calls out of
  // the listening-ended effect body.
  useEffect(() => {
    const text = pendingTranscriptRef.current;
    if (!text) return;
    pendingTranscriptRef.current = null;
    handleTranscript(text);
  }, [speech.isListening, speech.transcript, handleTranscript]);

  // ── effect: ask question when step changes ───────────────────────────────
  useEffect(() => {
    const p = phaseRef.current;
    if (p === "intro" || p === "done") return;
    if (p === "confirming" || p === "clarifying") return;
    askQuestion(stepIndex);
    // askQuestion is stable; stepIndex is the only real trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // ── start ─────────────────────────────────────────────────────────────────
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