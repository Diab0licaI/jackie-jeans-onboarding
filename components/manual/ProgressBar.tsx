interface ProgressBarProps {
  current: number; // 1-indexed current step
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-semibold tracking-wide text-[var(--color-slate)] uppercase">
          Question {current} of {total}
        </span>
        <span className="text-xs font-semibold text-[var(--color-thread)]">
          {pct}%
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-[var(--color-denim)]/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-thread)] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}