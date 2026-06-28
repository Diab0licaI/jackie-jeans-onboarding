"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col bg-[var(--color-cream)]">
      {/* Top brand mark */}
      <div className="px-6 pt-8 pb-4">
        <span className="font-display text-lg font-extrabold tracking-tight text-[var(--color-denim)]">
          JACKIE JEANS
        </span>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-[var(--color-denim)]">
          Jeans that fit.
          <br />
          The first time.
        </h1>

        <div className="stitch-line my-5 max-w-[120px]" />

        <p className="text-[var(--color-slate-dark)] text-base leading-relaxed mb-10">
          Two minutes of questions. Zero guesswork. Tell us about your body
          and how you like to wear denim — we&apos;ll find your size.
        </p>

        {/* Choice cards */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push("/manual")}
            className="group text-left w-full rounded-2xl border-2 border-[var(--color-denim)] bg-[var(--color-denim)] px-6 py-5 transition-transform active:scale-[0.98] hover:bg-[var(--color-denim-light)]"
          >
            <span className="block font-display text-lg font-bold text-[var(--color-cream)]">
              Fill out the quiz
            </span>
            <span className="block text-sm text-[var(--color-thread-light)] mt-1">
              Quick form · about 2 minutes
            </span>
          </button>

          <button
            onClick={() => router.push("/voice")}
            className="group text-left w-full rounded-2xl border-2 border-[var(--color-denim)] bg-transparent px-6 py-5 transition-transform active:scale-[0.98] hover:bg-[var(--color-denim)]/5"
          >
            <span className="block font-display text-lg font-bold text-[var(--color-denim)]">
              Talk to our stylist
            </span>
            <span className="block text-sm text-[var(--color-slate)] mt-1">
              Voice conversation · feels like a chat
            </span>
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--color-slate)] pb-8 px-6">
        Your answers stay private and are only used to size your jeans.
      </p>
    </main>
  );
}