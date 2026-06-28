"use client";

import { QuizQuestion, QuizAnswers } from "@/lib/quiz-data";

interface QuestionRendererProps {
  question: QuizQuestion;
  answers: QuizAnswers;
  onChange: (id: string, value: unknown) => void;
}

export default function QuestionRenderer({
  question,
  answers,
  onChange,
}: QuestionRendererProps) {
  switch (question.type) {
    case "dropdown":
      return (
        <select
          value={(answers as Record<string, unknown>)[question.id] as string ?? ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          className="w-full rounded-xl border-2 border-[var(--color-denim)]/20 bg-white px-4 py-4 text-lg text-[var(--color-denim)] focus:border-[var(--color-thread)] outline-none appearance-none"
        >
          <option value="" disabled>
            Select an option
          </option>
          {question.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case "single-select":
      return (
        <div className="flex flex-wrap gap-3">
          {question.options?.map((opt) => {
            const selected =
              (answers as Record<string, unknown>)[question.id] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(question.id, opt.value)}
                className={`rounded-full px-5 py-3 text-base font-medium border-2 transition-colors active:scale-[0.97] ${
                  selected
                    ? "bg-[var(--color-denim)] border-[var(--color-denim)] text-[var(--color-cream)]"
                    : "bg-white border-[var(--color-denim)]/20 text-[var(--color-denim)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );

    case "multi-select": {
      const selectedList: string[] =
        ((answers as Record<string, unknown>)[question.id] as string[]) ?? [];
      const toggle = (value: string) => {
        const next = selectedList.includes(value)
          ? selectedList.filter((v) => v !== value)
          : [...selectedList, value];
        onChange(question.id, next);
      };
      return (
        <div className="flex flex-wrap gap-2.5">
          {question.options?.map((opt) => {
            const selected = selectedList.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`rounded-full px-4 py-2.5 text-sm font-medium border-2 transition-colors active:scale-[0.97] ${
                  selected
                    ? "bg-[var(--color-thread)] border-[var(--color-thread)] text-white"
                    : "bg-white border-[var(--color-denim)]/20 text-[var(--color-denim)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "number-optional": {
      const val = (answers as Record<string, unknown>)[question.id];
      const skipped = val === null;
      return (
        <div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              disabled={skipped}
              value={skipped ? "" : (val as number | undefined) ?? ""}
              onChange={(e) =>
                onChange(
                  question.id,
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
              placeholder={`Weight in ${question.unit ?? ""}`}
              className="flex-1 rounded-xl border-2 border-[var(--color-denim)]/20 bg-white px-4 py-4 text-lg text-[var(--color-denim)] focus:border-[var(--color-thread)] outline-none disabled:opacity-40"
            />
            <span className="text-[var(--color-slate)] font-medium">
              {question.unit}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(question.id, skipped ? undefined : null)}
            className="mt-3 text-sm font-medium text-[var(--color-thread)] underline underline-offset-2"
          >
            {skipped ? "Actually, I'll add it" : "Prefer to skip this one"}
          </button>
        </div>
      );
    }

    case "brand-size-followup": {
      const selectedBrands: string[] = (answers.brands as string[]) ?? [];
      const sizes: Record<string, string> = answers.brandSizes ?? {};
      if (selectedBrands.length === 0) {
        return (
          <p className="text-[var(--color-slate)] text-base">
            No brands selected — you can skip this step.
          </p>
        );
      }
      return (
        <div className="flex flex-col gap-3">
          {selectedBrands.map((brand) => (
            <div key={brand} className="flex items-center gap-3">
              <span className="flex-1 text-base font-medium text-[var(--color-denim)]">
                {brand}
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Size"
                value={sizes[brand] ?? ""}
                onChange={(e) =>
                  onChange("brandSizes", { ...sizes, [brand]: e.target.value })
                }
                className="w-24 rounded-xl border-2 border-[var(--color-denim)]/20 bg-white px-3 py-3 text-base text-[var(--color-denim)] focus:border-[var(--color-thread)] outline-none"
              />
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}