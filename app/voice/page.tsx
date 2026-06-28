// app/voice/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConversationEngine } from "@/lib/use-conversation-engine";
import ProgressBar from "@/components/manual/ProgressBar";

// ── Mic button ────────────────────────────────────────────────────────────────
function MicButton({
  phase,
  onStart,
}: {
  phase: string;
  onStart: () => void;
}) {
  const isListening = phase === "listening";
  const isSpeaking = phase === "asking" || phase === "confirming" || phase === "clarifying";
  const isIdle = phase === "intro";

  return (
    <button
      onClick={isIdle ? onStart : undefined}
      disabled={!isIdle && !isListening}
      aria-label={isIdle ? "Start voice quiz" : isListening ? "Listening…" : "Jackie is speaking"}
      className={[
        "relative flex items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/50",
        isIdle
          ? "w-24 h-24 bg-indigo text-cream cursor-pointer hover:bg-indigo/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          : isListening
          ? "w-24 h-24 bg-gold text-indigo cursor-default shadow-lg"
          : isSpeaking
          ? "w-20 h-20 bg-indigo/20 text-indigo cursor-default"
          : "w-20 h-20 bg-indigo/10 text-indigo/40 cursor-default",
      ].join(" ")}
    >
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-gold/30 animate-ping" />
          <span className="absolute inset-[-8px] rounded-full border-2 border-gold/40 animate-pulse" />
        </>
      )}

      {isIdle ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 ml-1">
          <path d="M8 5v14l11-7z" />
        </svg>
      ) : isListening ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
          <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm6 10a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93V21H9v2h6v-2h-2v-2.07A8 8 0 0 0 20 11h-2z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </button>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ speaker, text }: { speaker: "ai" | "user"; text: string }) {
  const isAI = speaker === "ai";
  return (
    <div className={`flex gap-2 ${isAI ? "justify-start" : "justify-end"}`}>
      {isAI && (
        <div className="w-7 h-7 rounded-full bg-indigo flex-shrink-0 flex items-center justify-center mt-0.5">
          <span className="text-cream text-[10px] font-bold tracking-wide">JJ</span>
        </div>
      )}
      <div
        className={[
          "max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
          isAI
            ? "bg-indigo text-cream rounded-tl-sm"
            : "bg-gold/20 text-indigo rounded-tr-sm border border-gold/30",
        ].join(" ")}
      >
        {text}
      </div>
    </div>
  );
}

// ── Live caption bar ──────────────────────────────────────────────────────────
function LiveCaption({ text, active }: { text: string; active: boolean }) {
  if (!active && !text) return null;
  return (
    <div
      className={[
        "min-h-[44px] px-4 py-2.5 rounded-xl text-sm text-center transition-all duration-200",
        active
          ? "bg-gold/10 border border-gold/40 text-indigo"
          : "bg-transparent text-indigo/30",
      ].join(" ")}
    >
      {text || (
        <span className="flex items-center justify-center gap-1.5 text-indigo/40">
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce [animation-delay:300ms]" />
        </span>
      )}
    </div>
  );
}

// ── Phase label ───────────────────────────────────────────────────────────────
const PHASE_LABELS: Record<string, string> = {
  intro: "Tap to begin",
  asking: "Jackie is speaking…",
  listening: "Listening — speak now",
  confirming: "Got it, moving on…",
  clarifying: "Let me ask again…",
  done: "All done!",
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VoicePage() {
  const router = useRouter();
  const engine = useConversationEngine();
  const logEndRef = useRef<HTMLDivElement>(null);

  // Defer browser-API check until after hydration.
  // Server has no `window`, so isSupported is always false there — checking it
  // on first render causes a server/client HTML mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Scroll chat log to bottom on new entries
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [engine.log]);

  // Redirect when done
  useEffect(() => {
    if (engine.phase !== "done") return;
    const params = new URLSearchParams();
    params.set("answers", JSON.stringify(engine.answers));
    params.set("method", "voice");
    const timer = setTimeout(() => {
      router.push(`https://jackie-jeans.vercel.app/?${params.toString()}`);
    }, 1800);
    return () => clearTimeout(timer);
  }, [engine.phase, engine.answers, router]);

  // Pre-mount: return the same empty shell the server renders — no branch.
  if (!mounted) {
    return <main className="min-h-screen bg-cream flex flex-col" />;
  }

  // Post-mount: now safe to check real browser support.
  if (!engine.isSupported) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-2xl">🎙️</p>
          <h1 className="font-display text-xl font-semibold text-indigo">
            Voice not supported
          </h1>
          <p className="text-indigo/60 text-sm leading-relaxed">
            Your browser doesn&apos;t support the Web Speech API. Try Chrome,
            Edge, or Safari — or use the manual quiz instead.
          </p>
          <a
            href="/manual"
            className="inline-block mt-2 px-6 py-3 rounded-xl bg-indigo text-cream text-sm font-medium hover:bg-indigo/90 transition-colors"
          >
            Switch to manual
          </a>
        </div>
      </main>
    );
  }

  const isDone = engine.phase === "done";

  return (
    <main className="min-h-screen bg-cream flex flex-col">
      {/* ── Header ── */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <a
          href="/"
          className="text-indigo/40 hover:text-indigo transition-colors text-sm flex items-center gap-1.5"
          aria-label="Back to home"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </a>
        <span className="font-display text-indigo font-semibold tracking-tight text-sm">
          Jackie Jeans
        </span>
        <span className="text-indigo/40 text-xs tabular-nums">
          {engine.phase !== "intro" ? `${engine.stepIndex + 1} / ${engine.totalSteps}` : ""}
        </span>
      </header>

      {/* ── Progress bar ── */}
      {engine.phase !== "intro" && (
        <div className="px-5">
          <ProgressBar current={engine.stepIndex + 1} total={engine.totalSteps} />
        </div>
      )}

      {/* ── Stitch divider ── */}
      <div className="mx-5 my-3 border-t-2 border-dashed border-indigo/10" />

      {/* ── Chat log ── */}
      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3">
        {engine.log.length === 0 && engine.phase === "intro" && (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center space-y-3 pt-8">
            <p className="font-display text-2xl font-semibold text-indigo leading-tight">
              Find your perfect fit
            </p>
            <p className="text-indigo/50 text-sm max-w-[240px] leading-relaxed">
              Jackie will ask you 10 quick questions by voice. Just speak naturally.
            </p>
          </div>
        )}

        {engine.log.map((entry, i) => (
          <ChatBubble key={i} speaker={entry.speaker} text={entry.text} />
        ))}

        {isDone && (
          <ChatBubble
            speaker="ai"
            text="All done! Taking you to your results…"
          />
        )}

        <div ref={logEndRef} />
      </div>

      {/* ── Bottom panel ── */}
      <div className="px-5 pb-10 pt-4 space-y-4 bg-cream border-t border-indigo/8">
        {engine.phase === "listening" && (
          <LiveCaption
            text={engine.liveTranscript}
            active={engine.isListening}
          />
        )}

        <p className="text-center text-xs text-indigo/40 tracking-wide uppercase font-medium">
          {PHASE_LABELS[engine.phase] ?? ""}
        </p>

        <div className="flex justify-center">
          <MicButton phase={engine.phase} onStart={engine.start} />
        </div>

        {engine.phase === "intro" && (
          <p className="text-center text-[11px] text-indigo/30 leading-relaxed">
            Works best with headphones · Chrome / Edge / Safari
          </p>
        )}

        {engine.phase === "listening" && (
          <p className="text-center text-[11px] text-indigo/30">
            Speak clearly — Jackie will confirm what she heard
          </p>
        )}
      </div>
    </main>
  );
}