"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUIZ_QUESTIONS, QuizAnswers, TOTAL_STEPS } from "@/lib/quiz-data";
import ProgressBar from "@/components/manual/ProgressBar";
import QuestionRenderer from "@/components/manual/QuestionRenderer";

const REDIRECT_URL = "https://jackie-jeans.vercel.app/";

export default function ManualOnboardingPage() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0); // 0-indexed into QUIZ_QUESTIONS
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = QUIZ_QUESTIONS[stepIndex];
  const isLast = stepIndex === QUIZ_QUESTIONS.length - 1;

  function handleChange(id: string, value: unknown) {
    setError(null);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function isAnswered(): boolean {
    const val = (answers as Record<string, unknown>)[question.id];

    // Optional question: undefined (not yet touched) is NOT valid,
    // but null (explicitly skipped) IS valid.
    if (question.optional) {
      return val !== undefined;
    }

    // Brand-size followup: valid if there are no brands to size,
    // or if every selected brand has a size (size is a nice-to-have,
    // so we don't hard-block — partial is fine, brief treats Q9 as
    // following from Q8 rather than mandatory-complete).
    if (question.type === "brand-size-followup") {
      return true;
    }

    if (question.type === "multi-select") {
      return Array.isArray(val) && val.length > 0;
    }

    return val !== undefined && val !== null && val !== "";
  }

  function handleNext() {
    if (!isAnswered()) {
      setError(
        question.optional
          ? "Pick a value, or tap skip."
          : "Please answer this question to continue."
      );
      return;
    }
    setError(null);
    if (isLast) {
      setFinished(true);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    setError(null);
    if (stepIndex === 0) {
      setStarted(false);
    } else {
      setStepIndex((i) => i - 1);
    }
  }

  function handleRedirect() {
    // Bonus: carry the fit profile along as a query param so the main
    // site could read it if it chooses to.
    const profile = encodeURIComponent(JSON.stringify(answers));
    window.location.href = `${REDIRECT_URL}?fitProfile=${profile}`;
  }

  // ---------- Intro screen ----------
  if (!started) {
    return (
      <main className="min-h-screen flex flex-col bg-[var(--color-cream)] px-6">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <h1 className="font-display text-3xl font-extrabold text-[var(--color-denim)] leading-tight">
            Let&apos;s find your fit.
          </h1>
          <div className="stitch-line my-5 max-w-[100px]" />
          <p className="text-[var(--color-slate-dark)] text-base leading-relaxed mb-10">
            10 quick questions about your body and your denim preferences.
            Takes about 2 minutes — skip anything you&apos;re not sure of.
          </p>
          <button
            onClick={() => setStarted(true)}
            className="w-full rounded-2xl bg-[var(--color-denim)] text-[var(--color-cream)] font-display font-bold text-lg py-4 active:scale-[0.98] transition-transform"
          >
            Start the quiz
          </button>
        </div>
      </main>
    );
  }

  // ---------- Completion screen ----------
  if (finished) {
    return (
      <main className="min-h-screen flex flex-col bg-[var(--color-cream)] px-6">
        <div className="flex-1 flex flex-col justify-center items-center text-center max-w-md mx-auto w-full">
          <div className="w-16 h-16 rounded-full bg-[var(--color-thread)] flex items-center justify-center mb-6">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[var(--color-denim)]">
            You&apos;re all set.
          </h1>
          <div className="stitch-line my-5 max-w-[100px]" />
          <p className="text-[var(--color-slate-dark)] text-base leading-relaxed mb-10">
            We&apos;ve got your fit profile. Taking you to Jackie Jeans now to
            see your matches.
          </p>
          <button
            onClick={handleRedirect}
            className="w-full rounded-2xl bg-[var(--color-denim)] text-[var(--color-cream)] font-display font-bold text-lg py-4 active:scale-[0.98] transition-transform"
          >
            See my matches
          </button>
        </div>
      </main>
    );
  }

  // ---------- Question screen ----------
  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-cream)] px-6 pt-6 pb-10">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1">
        <ProgressBar current={stepIndex + 1} total={TOTAL_STEPS} />

        <div className="flex-1 flex flex-col justify-center">
          <h2 className="font-display text-2xl font-bold text-[var(--color-denim)] leading-snug mb-2 mt-10">
            {question.question}
          </h2>
          {question.optional && (
            <span className="inline-block text-xs font-semibold text-[var(--color-thread)] uppercase tracking-wide mb-6">
              Optional
            </span>
          )}
          {!question.optional && <div className="mb-6" />}

          <QuestionRenderer
            question={question}
            answers={answers}
            onChange={handleChange}
          />

          {error && (
            <p className="text-sm text-red-600 mt-4 font-medium">{error}</p>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleBack}
            className="rounded-2xl border-2 border-[var(--color-denim)]/20 text-[var(--color-denim)] font-semibold px-6 py-4 active:scale-[0.98] transition-transform"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 rounded-2xl bg-[var(--color-denim)] text-[var(--color-cream)] font-display font-bold text-lg py-4 active:scale-[0.98] transition-transform"
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </main>
  );
}